-- Admission/CRM attributes. Defaults preserve existing patient records.
ALTER TABLE "patients"
  ADD COLUMN "admittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "maritalStatus" TEXT;

CREATE INDEX "patients_organizationId_admittedAt_idx"
  ON "patients"("organizationId", "admittedAt");
