import { BadRequestException, Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export type WhatsAppIntegrationConfig = {
  organizationId: string;
  phoneNumberId: string;
  accessToken: string;
  appSecret: string;
  webhookVerifyTokenHash: string;
  apiVersion: string;
  appointmentTemplate: string;
  marketingTemplate: string | null;
  templateLanguage: string;
  enabled: boolean;
};

type IntegrationInput = {
  phoneNumberId: string;
  accessToken: string;
  appSecret: string;
  webhookVerifyToken: string;
  apiVersion?: string;
  appointmentTemplate: string;
  marketingTemplate?: string;
  templateLanguage?: string;
  enabled?: boolean;
};

@Injectable()
export class WhatsAppIntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(organizationId: string, input: IntegrationInput): Promise<void> {
    if (!this.encryptionKey()) throw new BadRequestException('WhatsApp encryption key is not configured');
    await this.prisma.whatsAppIntegration.upsert({
      where: { organizationId },
      create: {
        organizationId,
        phoneNumberId: input.phoneNumberId.trim(),
        accessTokenCiphertext: this.encrypt(input.accessToken),
        appSecretCiphertext: this.encrypt(input.appSecret),
        webhookVerifyTokenHash: this.hash(input.webhookVerifyToken),
        apiVersion: input.apiVersion?.trim() || 'v26.0',
        appointmentTemplate: input.appointmentTemplate.trim(),
        marketingTemplate: input.marketingTemplate?.trim() || null,
        templateLanguage: input.templateLanguage?.trim() || 'ar',
        enabled: input.enabled === true,
      },
      update: {
        phoneNumberId: input.phoneNumberId.trim(),
        accessTokenCiphertext: this.encrypt(input.accessToken),
        appSecretCiphertext: this.encrypt(input.appSecret),
        webhookVerifyTokenHash: this.hash(input.webhookVerifyToken),
        apiVersion: input.apiVersion?.trim() || 'v26.0',
        appointmentTemplate: input.appointmentTemplate.trim(),
        marketingTemplate: input.marketingTemplate?.trim() || null,
        templateLanguage: input.templateLanguage?.trim() || 'ar',
        enabled: input.enabled === true,
      },
    });
  }

  async summary(organizationId: string) {
    const record = await this.prisma.whatsAppIntegration.findUnique({ where: { organizationId }, select: { phoneNumberId: true, appointmentTemplate: true, marketingTemplate: true, templateLanguage: true, apiVersion: true, enabled: true, updatedAt: true } });
    return record ? { configured: true, ...record } : { configured: false };
  }

  async getForOrganization(organizationId: string): Promise<WhatsAppIntegrationConfig | null> {
    const record = await this.prisma.whatsAppIntegration.findUnique({ where: { organizationId } });
    return record ? this.decryptRecord(record) : null;
  }

  async getByPhoneNumberId(phoneNumberId: string): Promise<WhatsAppIntegrationConfig | null> {
    const record = await this.prisma.whatsAppIntegration.findUnique({ where: { phoneNumberId } });
    return record ? this.decryptRecord(record) : null;
  }

  async getByVerifyToken(token: string): Promise<WhatsAppIntegrationConfig | null> {
    const record = await this.prisma.whatsAppIntegration.findUnique({ where: { webhookVerifyTokenHash: this.hash(token) } });
    return record ? this.decryptRecord(record) : null;
  }

  private decryptRecord(record: { organizationId: string; phoneNumberId: string; accessTokenCiphertext: string; appSecretCiphertext: string; webhookVerifyTokenHash: string; apiVersion: string; appointmentTemplate: string; marketingTemplate: string | null; templateLanguage: string; enabled: boolean }): WhatsAppIntegrationConfig {
    return { organizationId: record.organizationId, phoneNumberId: record.phoneNumberId, accessToken: this.decrypt(record.accessTokenCiphertext), appSecret: this.decrypt(record.appSecretCiphertext), webhookVerifyTokenHash: record.webhookVerifyTokenHash, apiVersion: record.apiVersion, appointmentTemplate: record.appointmentTemplate, marketingTemplate: record.marketingTemplate, templateLanguage: record.templateLanguage, enabled: record.enabled };
  }

  private encryptionKey(): Buffer {
    const source = process.env.WHATSAPP_ENCRYPTION_KEY || (process.env.NODE_ENV === 'test' ? process.env.JWT_SECRET : undefined);
    if (!source) throw new Error('WHATSAPP_ENCRYPTION_KEY is not configured');
    return createHash('sha256').update(source).digest();
  }

  private encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64')).join('.');
  }

  private decrypt(value: string): string {
    const [ivEncoded, tagEncoded, ciphertextEncoded] = value.split('.');
    if (!ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error('Invalid encrypted WhatsApp secret');
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), Buffer.from(ivEncoded, 'base64'));
    decipher.setAuthTag(Buffer.from(tagEncoded, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, 'base64')), decipher.final()]).toString('utf8');
  }

  private hash(value: string): string { return createHash('sha256').update(value).digest('hex'); }
}
