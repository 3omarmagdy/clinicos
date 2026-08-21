CREATE TABLE "patients" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "medicalRecordNumber" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "dateOfBirth" TIMESTAMP(3),
  "gender" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "emergencyContactName" TEXT,
  "emergencyContactPhone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "patients_organizationId_medicalRecordNumber_key" ON "patients"("organizationId", "medicalRecordNumber");
CREATE INDEX "patients_organizationId_lastName_firstName_idx" ON "patients"("organizationId", "lastName", "firstName");
CREATE INDEX "patients_organizationId_phone_idx" ON "patients"("organizationId", "phone");
ALTER TABLE "patients" ADD CONSTRAINT "patients_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
