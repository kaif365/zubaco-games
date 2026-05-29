-- Compliance & Regulatory Fields
-- This migration adds age verification, geo-fencing, TDS tracking, and consent fields

-- Add new fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "date_of_birth" TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "age_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_accepted_at" TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "privacy_accepted_at" TIMESTAMP;

-- Add TDS_DEDUCTION and GST to TransactionType enum
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'TDS_DEDUCTION';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'GST';

-- Create TDS records table
CREATE TABLE IF NOT EXISTS "tds_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "financial_year" TEXT NOT NULL,
    "gross_winnings" DECIMAL(12,2) NOT NULL,
    "net_winnings" DECIMAL(12,2) NOT NULL,
    "tds_rate" DECIMAL(5,4) NOT NULL,
    "tds_amount" DECIMAL(12,2) NOT NULL,
    "transaction_id" TEXT,
    "pan_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tds_records_pkey" PRIMARY KEY ("id")
);

-- Add foreign key
ALTER TABLE "tds_records" ADD CONSTRAINT "tds_records_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index
CREATE INDEX IF NOT EXISTS "tds_records_user_id_financial_year_idx" ON "tds_records"("user_id", "financial_year");
