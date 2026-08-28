CREATE TABLE "messaging_quota_violations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT,
    "channel" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "attemptedCount" INTEGER NOT NULL DEFAULT 1,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messaging_quota_violations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "messaging_quota_violations_organizationId_channel_createdAt_idx" ON "messaging_quota_violations"("organizationId", "channel", "createdAt");
CREATE INDEX "messaging_quota_violations_organizationId_actorId_createdAt_idx" ON "messaging_quota_violations"("organizationId", "actorId", "createdAt");
CREATE INDEX "messaging_quota_violations_blockedUntil_idx" ON "messaging_quota_violations"("blockedUntil");

ALTER TABLE "messaging_quota_violations" ADD CONSTRAINT "messaging_quota_violations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messaging_quota_violations" ADD CONSTRAINT "messaging_quota_violations_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
