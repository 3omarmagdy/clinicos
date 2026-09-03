ALTER TABLE "whatsapp_connections" ADD COLUMN IF NOT EXISTS "remindersEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "whatsapp_campaigns" ADD COLUMN IF NOT EXISTS "queueStartedAt" TIMESTAMP(3);
ALTER TABLE "whatsapp_campaign_recipients"
  ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastError" TEXT,
  ADD COLUMN IF NOT EXISTS "nextAttemptAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "whatsapp_campaign_recipients_status_nextAttemptAt_idx"
  ON "whatsapp_campaign_recipients"("status", "nextAttemptAt");
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_messages_appointmentId_key"
  ON "whatsapp_messages"("appointmentId");
