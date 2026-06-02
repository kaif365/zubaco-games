-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "serverSeed" TEXT NOT NULL,
    "clientSeed" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL,
    "finalSeed" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3) NOT NULL,
    "finalScore" INTEGER,
    "solved" BOOLEAN,
    "totalMoves" INTEGER,
    "sortedTubes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Input" (
    "id" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "fromTube" INTEGER NOT NULL,
    "toTube" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Input_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "tubes" JSONB NOT NULL,
    "moveCount" INTEGER NOT NULL,
    "elapsed" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuration" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tubeCount" INTEGER NOT NULL,
    "colorCount" INTEGER NOT NULL,
    "ballsPerTube" INTEGER NOT NULL DEFAULT 4,
    "emptyTubes" INTEGER NOT NULL DEFAULT 2,
    "timeLimitMs" INTEGER NOT NULL,
    "pointsPerSortedTube" INTEGER NOT NULL DEFAULT 100,
    "timeBonusMultiplier" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheatFlag" (
    "id" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheatFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Input_gameSessionId_idx" ON "Input"("gameSessionId");

-- CreateIndex
CREATE INDEX "Snapshot_gameSessionId_idx" ON "Snapshot"("gameSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Configuration_stageId_key" ON "Configuration"("stageId");

-- CreateIndex
CREATE INDEX "CheatFlag_gameSessionId_idx" ON "CheatFlag"("gameSessionId");

-- AddForeignKey
ALTER TABLE "Input" ADD CONSTRAINT "Input_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheatFlag" ADD CONSTRAINT "CheatFlag_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
