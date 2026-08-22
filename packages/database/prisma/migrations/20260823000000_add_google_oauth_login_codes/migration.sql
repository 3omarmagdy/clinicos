CREATE TABLE "oauth_login_codes" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "oauth_login_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "oauth_login_codes_codeHash_key" ON "oauth_login_codes"("codeHash");
CREATE INDEX "oauth_login_codes_organizationId_expiresAt_idx" ON "oauth_login_codes"("organizationId", "expiresAt");
CREATE INDEX "oauth_login_codes_userId_expiresAt_idx" ON "oauth_login_codes"("userId", "expiresAt");

ALTER TABLE "oauth_login_codes" ADD CONSTRAINT "oauth_login_codes_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "oauth_login_codes" ADD CONSTRAINT "oauth_login_codes_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
