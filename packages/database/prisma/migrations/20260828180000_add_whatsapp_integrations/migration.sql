CREATE TABLE "whatsapp_integrations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "accessTokenCiphertext" TEXT NOT NULL,
    "accessTokenIv" TEXT NOT NULL,
    "accessTokenAuthTag" TEXT NOT NULL,
    "apiVersion" TEXT NOT NULL DEFAULT 'v26.0',
    "appointmentTemplate" TEXT NOT NULL,
    "marketingTemplate" TEXT,
    "templateLanguage" TEXT NOT NULL DEFAULT 'ar',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_integrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_integrations_organizationId_key" ON "whatsapp_integrations"("organizationId");
CREATE UNIQUE INDEX "whatsapp_integrations_phoneNumberId_key" ON "whatsapp_integrations"("phoneNumberId");
CREATE INDEX "whatsapp_integrations_enabled_idx" ON "whatsapp_integrations"("enabled");

ALTER TABLE "whatsapp_integrations" ADD CONSTRAINT "whatsapp_integrations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
