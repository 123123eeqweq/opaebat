-- Manual migration for price_points table
-- Run this SQL directly in PostgreSQL if Prisma migrate fails

CREATE TABLE IF NOT EXISTS "price_points" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "price_points_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "price_points_symbol_timestamp_key" ON "price_points"("symbol", "timestamp");

-- Create index for queries
CREATE INDEX IF NOT EXISTS "price_points_symbol_timestamp_idx" ON "price_points"("symbol", "timestamp" DESC);
