import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
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
  accessToken?: string;
  apiVersion?: string;
  appointmentTemplate: string;
  marketingTemplate?: string;
  templateLanguage?: string;
  enabled?: boolean;
};

type EncryptedValue = { ciphertext: string; iv: string; authTag: string };
type MetaGraphResponse = { ok: boolean; json(): Promise<unknown> };
type MetaTokenResponse = { access_token?: string; error?: { code?: number } };
type MetaTemplate = { name?: unknown; language?: unknown; status?: unknown; category?: unknown; components?: unknown };
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
  private legacySchemaRepair: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async upsert(organizationId: string, input: IntegrationInput): Promise<void> {
    await this.ensureLegacyIntegrationSchema();
    const existing = await this.prisma.whatsAppIntegration.findUnique({ where: { organizationId } }) as IntegrationRecord | null;
    const accessToken = input.accessToken?.trim() || (existing ? this.decryptRecord(existing).accessToken : '');
    if (!accessToken) throw new BadRequestException('Access Token مطلوب لحفظ إعدادات WhatsApp.');
    // A temporary Cloud API token can send messages but may not be allowed to
    // read phone-number metadata. Do not block a disabled configuration on a
    // management-only read; the actual send path remains the final check.
    const encrypted = this.encrypt(accessToken);
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
    await this.ensureLegacyIntegrationSchema();
    const record = await this.prisma.whatsAppIntegration.findUnique({ where: { organizationId }, select: { phoneNumberId: true, wabaId: true, appointmentTemplate: true, marketingTemplate: true, templateLanguage: true, apiVersion: true, enabled: true, updatedAt: true } });
    return record ? { configured: true, ...record } : { configured: false };
  }

  /** Lists the exact approved templates and language codes for this clinic. */
  async approvedTemplates(organizationId: string) {
    const integration = await this.getForOrganization(organizationId);
    if (!integration) throw new BadRequestException('اربط WhatsApp Business أولًا قبل قراءة القوالب المعتمدة.');

    const params = new URLSearchParams({ fields: 'name,language,status,category,components', limit: '250', access_token: integration.accessToken });
    try {
      const response = await fetch(`https://graph.facebook.com/${integration.apiVersion}/${integration.wabaId}/message_templates?${params.toString()}`) as unknown as MetaGraphResponse;
      const body = await response.json() as { data?: unknown; error?: { message?: string; code?: number } };
      if (!response.ok || !Array.isArray(body.data)) {
        throw new Error(body.error?.message || 'Meta did not return templates');
      }
      return body.data.flatMap((item) => {
        const template = item as MetaTemplate;
        if (template.status !== 'APPROVED' || typeof template.name !== 'string' || typeof template.language !== 'string') return [];
        const bodyComponent = Array.isArray(template.components) ? template.components.find((component) => typeof component === 'object' && component !== null && (component as { type?: unknown }).type === 'BODY') as { text?: unknown } | undefined : undefined;
        const bodyText = typeof bodyComponent?.text === 'string' ? bodyComponent.text : '';
        const parameterCount = (bodyText.match(/{{\d+}}/g) || []).length;
        return [{ name: template.name, language: template.language, category: typeof template.category === 'string' ? template.category : null, parameterCount }];
      });
    } catch (error) {
      throw new BadRequestException(`تعذر قراءة القوالب المعتمدة من Meta: ${error instanceof Error ? error.message : 'تحقق من صلاحيات Access Token.'}`);
    }
  }

  async getForOrganization(organizationId: string): Promise<WhatsAppIntegrationConfig | null> {
    await this.ensureLegacyIntegrationSchema();
    const record = await this.prisma.whatsAppIntegration.findUnique({ where: { organizationId } }) as IntegrationRecord | null;
    return record ? this.decryptRecord(record) : null;
  }

  async getByPhoneNumberId(phoneNumberId: string): Promise<WhatsAppIntegrationConfig | null> {
    await this.ensureLegacyIntegrationSchema();
    const record = await this.prisma.whatsAppIntegration.findUnique({ where: { phoneNumberId } }) as IntegrationRecord | null;
    return record ? this.decryptRecord(record) : null;
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

  /**
   * Early production databases received an incomplete version of this table.
   * The formal migration remains authoritative; this idempotent fallback makes
   * the settings page recover safely when an older table is already present.
   */
  private ensureLegacyIntegrationSchema(): Promise<void> {
    if (this.legacySchemaRepair) return this.legacySchemaRepair;

    const execute = (this.prisma as PrismaService & { $executeRawUnsafe?: (sql: string) => Promise<unknown> }).$executeRawUnsafe;
    if (!execute) return Promise.resolve();

    // Prisma prepared statements accept one PostgreSQL command.  Keep every
    // additive repair inside one DO block instead of sending a SQL batch.
    this.legacySchemaRepair = execute.call(this.prisma, `
      DO $$
      BEGIN
        IF to_regclass('whatsapp_integrations') IS NULL THEN
          RETURN;
        END IF;

        ALTER TABLE "whatsapp_integrations"
          ADD COLUMN IF NOT EXISTS "wabaId" TEXT,
          ADD COLUMN IF NOT EXISTS "accessTokenCiphertext" TEXT,
          ADD COLUMN IF NOT EXISTS "accessTokenIv" TEXT,
          ADD COLUMN IF NOT EXISTS "accessTokenAuthTag" TEXT,
          ADD COLUMN IF NOT EXISTS "apiVersion" TEXT DEFAULT 'v26.0',
          ADD COLUMN IF NOT EXISTS "appointmentTemplate" TEXT,
          ADD COLUMN IF NOT EXISTS "marketingTemplate" TEXT,
          ADD COLUMN IF NOT EXISTS "templateLanguage" TEXT DEFAULT 'ar',
          ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
          ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'whatsapp_integrations'
            AND column_name = 'appSecretCiphertext'
        ) THEN
          ALTER TABLE "whatsapp_integrations" ALTER COLUMN "appSecretCiphertext" DROP NOT NULL;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'whatsapp_integrations'
            AND column_name = 'webhookVerifyTokenHash'
        ) THEN
          ALTER TABLE "whatsapp_integrations" ALTER COLUMN "webhookVerifyTokenHash" DROP NOT NULL;
        END IF;
      END $$;
    `).then(() => undefined).catch(() => {
      this.legacySchemaRepair = null;
      throw new ServiceUnavailableException('تعذر تجهيز قاعدة بيانات WhatsApp. راجع اتصال قاعدة البيانات ثم أعد المحاولة.');
    });

    return this.legacySchemaRepair;
  }

  private encryptionKey(): Buffer {
    // This key must be configured once and kept stable in the API production environment.
    // Never fall back to JWT_SECRET in production: rotating JWT credentials would make
    // existing WhatsApp tokens undecryptable and could cause an opaque 500 response.
    const source = process.env.WHATSAPP_ENCRYPTION_KEY?.trim();
    if (!source || source.length < 32) {
      throw new ServiceUnavailableException('إعدادات WhatsApp غير مكتملة على الخادم: يجب ضبط WHATSAPP_ENCRYPTION_KEY بطول لا يقل عن 32 حرفًا.');
    }
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
