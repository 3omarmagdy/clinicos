-- Keep WhatsApp marketing consent separate from appointment reminders and generic marketing consent.
ALTER TABLE "patients"
  ADD COLUMN "whatsappMarketingOptIn" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "whatsappMarketingOptInAt" TIMESTAMP(3);

CREATE TABLE "marketing_campaigns" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "templateName" TEXT NOT NULL,
  "offerText" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdById" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_campaign_recipients" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "providerMessageId" TEXT,
  "failureReason" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "marketing_campaign_recipients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "marketing_campaign_recipients_dedupeKey_key" ON "marketing_campaign_recipients"("dedupeKey");
CREATE UNIQUE INDEX "marketing_campaign_recipients_campaignId_patientId_key" ON "marketing_campaign_recipients"("campaignId", "patientId");
CREATE INDEX "marketing_campaigns_organizationId_status_createdAt_idx" ON "marketing_campaigns"("organizationId", "status", "createdAt");
CREATE INDEX "marketing_campaigns_organizationId_createdAt_idx" ON "marketing_campaigns"("organizationId", "createdAt");
CREATE INDEX "marketing_campaign_recipients_campaignId_status_idx" ON "marketing_campaign_recipients"("campaignId", "status");
CREATE INDEX "marketing_campaign_recipients_patientId_createdAt_idx" ON "marketing_campaign_recipients"("patientId", "createdAt");

ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketing_campaign_recipients" ADD CONSTRAINT "marketing_campaign_recipients_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_campaign_recipients" ADD CONSTRAINT "marketing_campaign_recipients_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Make the new capability available to existing and future Owner/Admin roles.
INSERT INTO "permissions" ("id", "code", "category", "description", "createdAt", "updatedAt")
SELECT 'perm_marketing_send', 'marketing:send', 'marketing', 'Create and send consented WhatsApp marketing campaigns', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "code" = 'marketing:send');

INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT 'rperm_marketing_send_' || md5(r."id"), r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE p."code" = 'marketing:send'
  AND r."name" IN ('Owner', 'Admin')
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" existing
    WHERE existing."roleId" = r."id" AND existing."permissionId" = p."id"
  );
