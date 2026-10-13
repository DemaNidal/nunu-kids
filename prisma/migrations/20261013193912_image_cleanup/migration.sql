-- CreateTable
CREATE TABLE "ImageCheck" (
    "ref" TEXT NOT NULL,
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageCheck_pkey" PRIMARY KEY ("ref")
);

-- CreateIndex
CREATE INDEX "ImageCheck_since_idx" ON "ImageCheck"("since");
