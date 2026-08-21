CREATE TABLE "clinical_records" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "symptoms" TEXT,
  "diagnosis" TEXT,
  "treatmentPlan" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "clinical_records_organizationId_patientId_createdAt_idx"
  ON "clinical_records"("organizationId", "patientId", "createdAt");
CREATE INDEX "clinical_records_organizationId_id_idx"
  ON "clinical_records"("organizationId", "id");

ALTER TABLE "clinical_records"
  ADD CONSTRAINT "clinical_records_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_records"
  ADD CONSTRAINT "clinical_records_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_records"
  ADD CONSTRAINT "clinical_records_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
