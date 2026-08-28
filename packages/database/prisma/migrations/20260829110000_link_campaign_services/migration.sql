ALTER TABLE "marketing_campaigns" ADD COLUMN "serviceId" TEXT;
CREATE INDEX "marketing_campaigns_serviceId_idx" ON "marketing_campaigns"("serviceId");
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
