-- =========================================================================
-- MIGRATION: Add purchase_price to weddings & backfill existing active rows
-- Mode: Additive & Idempotent (Safe for Live Production DB)
-- Backup reference: db/backups/weddings_backup_20261120.json
-- Run in Supabase SQL Editor (SQL Editor -> New Query)
-- =========================================================================

-- 1. Add purchase_price column (IDR, integer/bigint) to weddings table
ALTER TABLE IF EXISTS weddings
  ADD COLUMN IF NOT EXISTS purchase_price BIGINT NULL;

-- 2. Backfill purchase_price for all active invitations where it is still NULL
--    Baseline: 50% of active homepage promo price at migration time
UPDATE weddings
SET purchase_price = CASE LOWER(TRIM(COALESCE(template, 'noir')))
  WHEN 'lumiere' THEN 150000
  WHEN 'lumiere-metatah' THEN 150000
  WHEN 'lumiere-metatah-v2' THEN 150000
  WHEN 'atelier' THEN 150000
  WHEN 'allure' THEN 125000
  WHEN 'nocturne' THEN 125000
  WHEN 'editorial' THEN 100000
  WHEN 'deauville' THEN 100000
  WHEN 'terre' THEN 75000
  WHEN 'air' THEN 75000
  WHEN 'noir' THEN 75000
  ELSE purchase_price
END
WHERE purchase_price IS NULL
  AND deleted_at IS NULL;

-- =========================================================================
-- ROLLBACK (Run manually only if you need to revert the schema change)
-- =========================================================================
-- ALTER TABLE IF EXISTS weddings DROP COLUMN IF EXISTS purchase_price;
