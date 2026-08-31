ALTER TABLE "Order" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'ONLINE';

CREATE INDEX "Order_channel_createdAt_idx" ON "Order"("channel", "createdAt");
