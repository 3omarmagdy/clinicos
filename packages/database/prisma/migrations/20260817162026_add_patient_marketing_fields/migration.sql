-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "city" TEXT,
ADD COLUMN     "governorate" TEXT,
ADD COLUMN     "leadSource" TEXT,
ADD COLUMN     "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingConsentAt" TIMESTAMP(3),
ADD COLUMN     "occupation" TEXT;

-- DropEnum
DROP TYPE "UserStatus";
