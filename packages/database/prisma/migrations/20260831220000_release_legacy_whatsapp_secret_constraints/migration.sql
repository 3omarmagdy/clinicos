-- Legacy versions stored per-clinic Meta app secrets and webhook verify tokens.
-- These values are now server-only environment secrets, never tenant data.
-- Retain legacy columns for compatibility, but permit NULL so current secure
-- tenant configuration can be stored without fabricating secret values.
DO $$
BEGIN
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
