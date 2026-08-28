-- CreateTable
CREATE TABLE "auth_login_failures" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_login_failures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_login_failures_keyHash_createdAt_idx" ON "auth_login_failures"("keyHash", "createdAt");
