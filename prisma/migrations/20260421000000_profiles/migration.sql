-- CreateTable
CREATE TABLE "Profile" (
    "name" VARCHAR(20) NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "maxLevel" INTEGER NOT NULL DEFAULT 1,
    "linesThisLevel" INTEGER NOT NULL DEFAULT 0,
    "totalLines" INTEGER NOT NULL DEFAULT 0,
    "totalGames" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "lastScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPlayedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE INDEX "Profile_bestScore_idx" ON "Profile"("bestScore" DESC);

-- CreateIndex
CREATE INDEX "Profile_lastPlayedAt_idx" ON "Profile"("lastPlayedAt" DESC);
