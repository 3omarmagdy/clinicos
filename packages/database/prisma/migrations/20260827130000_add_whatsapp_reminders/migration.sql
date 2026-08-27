-- Add WhatsApp contact and consent fields to patients.
ALTER TABLE "patients"
  ADD COLUMN "whatsappPhone" TEXT,
  ADD COLUMN "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "whatsappOptInAt" TIMESTAMP(3);

-- Keep reminder delivery idempotent at appointment level.
ALTER TABLE "appointments"
  ADD COLUMN "whatsappReminderSentAt" TIMESTAMP(3),
  ADD COLUMN "whatsappReminderMessageId" TEXT;

CREATE INDEX "appointments_whatsappReminderSentAt_scheduledAt_idx"
  ON "appointments"("whatsappReminderSentAt", "scheduledAt");
