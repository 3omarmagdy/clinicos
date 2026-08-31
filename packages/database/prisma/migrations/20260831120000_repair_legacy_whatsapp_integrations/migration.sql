-- Some early production databases received an incomplete WhatsApp table through
-- schema push. Keep this repair additive so no existing tenant data is removed.
ALTER TABLE IF EXISTS "whatsapp_integrations"
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

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_integrations_organizationId_key"
  ON "whatsapp_integrations"("organizationId");

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_integrations_phoneNumberId_key"
  ON "whatsapp_integrations"("phoneNumberId");

CREATE INDEX IF NOT EXISTS "whatsapp_integrations_enabled_idx"
  ON "whatsapp_integrations"("enabled");
