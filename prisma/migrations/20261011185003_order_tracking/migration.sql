-- CreateTable
CREATE TABLE "OrderAccess" (
    "id" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderAccess_orderId_idx" ON "OrderAccess"("orderId");

-- AddForeignKey
ALTER TABLE "OrderAccess" ADD CONSTRAINT "OrderAccess_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
