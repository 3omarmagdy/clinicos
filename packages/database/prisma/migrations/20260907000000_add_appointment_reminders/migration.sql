-- Appointment reminders are provider-neutral. The unique key prevents a
-- retry/cron run from sending the same channel twice for one appointment.
CREATE TABLE IF NOT EXISTS "appointment_reminders" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "providerId" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "appointment_reminders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "appointment_reminders_appointmentId_channel_key"
  ON "appointment_reminders"("appointmentId", "channel");
CREATE INDEX IF NOT EXISTS "appointment_reminders_organizationId_status_scheduledAt_idx"
  ON "appointment_reminders"("organizationId", "status", "scheduledAt");

DO $$ BEGIN
  ALTER TABLE "appointment_reminders" ADD CONSTRAINT "appointment_reminders_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "appointment_reminders" ADD CONSTRAINT "appointment_reminders_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "appointment_reminders" ADD CONSTRAINT "appointment_reminders_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
