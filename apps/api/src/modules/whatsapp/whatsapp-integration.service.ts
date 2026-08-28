import { BadRequestException, Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export type WhatsAppIntegrationConfig = {
  organizationId: string;
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  apiVersion: string;
  appointmentTemplate: string;
  marketingTemplate: string | null;
  templateLanguage: string;
  enabled: boolean;
};

type IntegrationInput = {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  apiVersion?: string;
  appointmentTemplate: string;
  marketingTemplate?: string;
  templateLanguage?: string;
  enabled?: boolean;
};

type EncryptedValue = { ciphertext: string; iv: string; authTag: string };
type IntegrationRecord = {
  organizationId: string;
  phoneNumberId: string;
  wabaId: string;
  accessTokenCiphertext: string;
  accessTokenIv: string;
  accessTokenAuthTag: string;
  apiVersion: string;
  appointmentTemplate: string;
  marketingTemplate: string | null;
  templateLanguage: string;
  enabled: boolean;
};

@Injectable()
export class WhatsAppIntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(organizationId: string, input: IntegrationInput): Promise<void> {
    if (!this.encryptionKey()) throw new BadRequestException('WhatsApp encryption key is not configured');
    await this.validateWithMeta(input);
    const encrypted = this.encrypt(input.accessToken);
    const data = {
      phoneNumberId: input.phoneNumberId.trim(),
      wabaId: input.wabaId.trim(),
      accessTokenCiphertext: encrypted.ciphertext,
      accessTokenIv: encrypted.iv,
      accessTokenAuthTag: encrypted.authTag,
      apiVersion: input.apiVersion?.trim() || 'v26.0',
      appointmentTemplate: input.appointmentTemplate.trim(),
      marketingTemplate: input.marketingTemplate?.trim() || null,
      templateLanguage: input.templateLanguage?.trim() || 'ar',
      enabled: input.enabled === true,
    };
    await this.prisma.whatsAppIntegration.upsert({ where: { organizationId }, create: { organizationId, ...data }, update: data });
  }

  async summary(organizationId: string) {
    const record = await this.prisma.whatsAppIntegration.findUnique({ where: { organizationId }, select: { phoneNumberId: true, wabaId: true, appointmentTemplate: true, marketingTemplate: true, templateLanguage: true, apiVersion: true, enabled: true, updatedAt: true } });
    return record ? { configured: true, ...record } : { configured: false };
  }

  async getForOrganization(organizationId: string): Promise<WhatsAppIntegrationConfig | null> {
    const record = await this.prisma.whatsAppIntegration.findUnique({ where: { organizationId } }) as IntegrationRecord | null;
    return record ? this.decryptRecord(record) : null;
  }

  async getByPhoneNumberId(phoneNumberId: string): Promise<WhatsAppIntegrationConfig | null> {
    const record = await this.prisma.whatsAppIntegration.findUnique({ where: { phoneNumberId } }) as IntegrationRecord | null;
    return record ? this.decryptRecord(record) : null;
  }

  private async validateWithMeta(input: IntegrationInput): Promise<void> {
    const apiVersion = input.apiVersion?.trim() || 'v26.0';
    try {
      const response = await fetch(`https://graph.facebook.com/${apiVersion}/${encodeURIComponent(input.phoneNumberId.trim())}?fields=id,whatsapp_business_account`, { headers: { Authorization: `Bearer ${input.accessToken}` } });
      const body = await response.json() as { id?: string; whatsapp_business_account?: { id?: string }; error?: { code?: number } };
      if (!response.ok || body.id !== input.phoneNumberId.trim() || body.whatsapp_business_account?.id !== input.wabaId.trim()) throw new Error(`Meta validation failed${body.error?.code ? ` (${body.error.code})` : ''}`);
    } catch {
      throw new BadRequestException('تعذر التحقق من Phone Number ID وWABA ID وAccess Token عبر Meta. راجع بيانات الربط وصلاحيات Access Token.');
    }
  }

  private decryptRecord(record: IntegrationRecord): WhatsAppIntegrationConfig {
    return { organizationId: record.organizationId, phoneNumberId: record.phoneNumberId, wabaId: record.wabaId, accessToken: this.decrypt(record.accessTokenCiphertext, record.accessTokenIv, record.accessTokenAuthTag), apiVersion: record.apiVersion, appointmentTemplate: record.appointmentTemplate, marketingTemplate: record.marketingTemplate, templateLanguage: record.templateLanguage, enabled: record.enabled };
  }

  private encryptionKey(): Buffer {
    const source = process.env.WHATSAPP_ENCRYPTION_KEY || (process.env.NODE_ENV === 'test' ? process.env.JWT_SECRET : undefined);
    if (!source) throw new Error('WHATSAPP_ENCRYPTION_KEY is not configured');
    return createHash('sha256').update(source).digest();
  }

  private encrypt(value: string): EncryptedValue {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return { ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), authTag: cipher.getAuthTag().toString('base64') };
  }

  private decrypt(ciphertext: string, iv: string, authTag: string): string {
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
  }
}
