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
type MetaGraphResponse = { ok: boolean; json(): Promise<unknown> };
type MetaGraphError = { code?: number };
type MetaTokenResponse = { access_token?: string; error?: MetaGraphError };
type MetaPhoneNumberResponse = { id?: string; whatsapp_business_account?: { id?: string }; error?: MetaGraphError };
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

  /** Sends only public Meta configuration to the clinic browser. */
  embeddedSignupConfig() {
    const appId = process.env.META_APP_ID;
    const configurationId = process.env.META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID;
    const enabled = process.env.META_WHATSAPP_EMBEDDED_SIGNUP_ENABLED === 'true';
    return {
      configured: Boolean(enabled && appId && configurationId && process.env.META_APP_SECRET),
      appId: enabled && appId ? appId : undefined,
      configurationId: enabled && configurationId ? configurationId : undefined,
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v26.0',
    };
  }

  async completeEmbeddedSignup(organizationId: string, input: Omit<IntegrationInput, 'accessToken'> & { code: string }): Promise<void> {
    const accessToken = await this.exchangeEmbeddedSignupCode(input.code, input.apiVersion);
    await this.upsert(organizationId, { ...input, accessToken });
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
      const response = await fetch(`https://graph.facebook.com/${apiVersion}/${encodeURIComponent(input.phoneNumberId.trim())}?fields=id,whatsapp_business_account`, { headers: { Authorization: `Bearer ${input.accessToken}` } }) as unknown as MetaGraphResponse;
      const body = await response.json() as MetaPhoneNumberResponse;
      if (!response.ok) throw new BadRequestException(this.metaValidationMessage(body.error));
      if (body.id !== input.phoneNumberId.trim() || body.whatsapp_business_account?.id !== input.wabaId.trim()) {
        throw new BadRequestException('Phone Number ID وWABA ID لا ينتميان إلى نفس حساب WhatsApp Business. انسخهما من نفس صفحة Meta ثم أعد المحاولة.');
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('تعذر التحقق من Phone Number ID وWABA ID وAccess Token عبر Meta. راجع بيانات الربط وصلاحيات Access Token.');
    }
  }

  private metaValidationMessage(error?: MetaGraphError): string {
    switch (error?.code) {
      case 190:
        return 'Access Token غير صالح أو انتهت صلاحيته. أنشئ Token جديدًا من Meta واحفظه فورًا.';
      case 100:
        return 'Phone Number ID غير صحيح أو لا يمكن للـAccess Token الوصول إليه. تأكد من الرقم والصلاحيات.';
      case 10:
      case 200:
        return 'Access Token لا يملك صلاحية الوصول إلى WhatsApp Business. أنشئ Token بالصلاحيات الصحيحة ثم أعد المحاولة.';
      case 4:
      case 17:
        return 'Meta أوقفت المحاولات مؤقتًا بسبب كثرتها. انتظر قليلًا ثم أعد المحاولة.';
      default:
        return `رفضت Meta التحقق من بيانات الربط${error?.code ? ` (رمز ${error.code})` : ''}. راجع الـIDs والـAccess Token.`;
    }
  }

  private async exchangeEmbeddedSignupCode(code: string, requestedVersion?: string): Promise<string> {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (process.env.META_WHATSAPP_EMBEDDED_SIGNUP_ENABLED !== 'true' || !appId || !appSecret) {
      throw new BadRequestException('ربط Meta التلقائي غير مهيأ بعد. استخدم الربط اليدوي أو اطلب من مدير المنصة إكمال إعداد Meta.');
    }
    const apiVersion = requestedVersion?.trim() || process.env.WHATSAPP_API_VERSION || 'v26.0';
    const params = new URLSearchParams({ client_id: appId, client_secret: appSecret, code: code.trim() });
    try {
      const response = await fetch(`https://graph.facebook.com/${apiVersion}/oauth/access_token?${params.toString()}`) as unknown as MetaGraphResponse;
      const body = await response.json() as MetaTokenResponse;
      if (!response.ok || !body.access_token) throw new Error(`Meta token exchange failed${body.error?.code ? ` (${body.error.code})` : ''}`);
      return body.access_token;
    } catch {
      throw new BadRequestException('تعذر إتمام ربط Meta. أعد فتح خطوة الربط وجرّب مرة أخرى.');
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
