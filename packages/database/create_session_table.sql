-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "storeUserId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_storeUserId_idx" ON "Session"("storeUserId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_storeUserId_fkey" FOREIGN KEY ("storeUserId") REFERENCES "StoreUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
