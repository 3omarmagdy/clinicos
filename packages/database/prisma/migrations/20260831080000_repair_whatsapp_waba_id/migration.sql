-- Repair a production database whose WhatsApp integration table is missing wabaId.
ALTER TABLE "whatsapp_integrations"
  ADD COLUMN IF NOT EXISTS "wabaId" TEXT NOT NULL DEFAULT '';

ALTER TABLE "whatsapp_integrations"
  ALTER COLUMN "wabaId" DROP DEFAULT;
