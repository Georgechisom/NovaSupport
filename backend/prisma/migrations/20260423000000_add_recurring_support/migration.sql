-- CreateTable
CREATE TABLE "RecurringSupport" (
    "id" TEXT NOT NULL,
    "supporterAddress" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "amount" DECIMAL(18,7) NOT NULL,
    "assetCode" TEXT NOT NULL,
    "assetIssuer" TEXT,
    "frequency" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringSupport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringSupport_supporterAddress_idx" ON "RecurringSupport"("supporterAddress");

-- CreateIndex
CREATE INDEX "RecurringSupport_profileId_idx" ON "RecurringSupport"("profileId");
