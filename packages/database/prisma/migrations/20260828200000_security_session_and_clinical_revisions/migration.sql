ALTER TABLE "users" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "clinical_record_revisions" (
  "id" TEXT NOT NULL,
  "clinicalRecordId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "revisionNumber" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "changedFields" TEXT[] NOT NULL,
  "changedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "clinical_record_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clinical_record_revisions_clinicalRecordId_revisionNumber_key"
  ON "clinical_record_revisions"("clinicalRecordId", "revisionNumber");
CREATE INDEX "clinical_record_revisions_organizationId_patientId_createdAt_idx"
  ON "clinical_record_revisions"("organizationId", "patientId", "createdAt");

ALTER TABLE "clinical_record_revisions"
  ADD CONSTRAINT "clinical_record_revisions_clinicalRecordId_fkey"
  FOREIGN KEY ("clinicalRecordId") REFERENCES "clinical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_record_revisions"
  ADD CONSTRAINT "clinical_record_revisions_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_record_revisions"
  ADD CONSTRAINT "clinical_record_revisions_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_record_revisions"
  ADD CONSTRAINT "clinical_record_revisions_changedById_fkey"
  FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
