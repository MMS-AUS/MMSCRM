-- ==============================================================================
-- MIGRATION: Add deposit_aud, deposit_received_date, sale_date, and system_price_aud
-- Target: Supabase (PostgreSQL 15+)
-- Run this query in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Add deposit, deposit_aud, deposit_received_date, sale_date, and system_price_aud to public.leads
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS deposit_aud NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS deposit NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS deposit_received_date DATE,
  ADD COLUMN IF NOT EXISTS sale_date DATE,
  ADD COLUMN IF NOT EXISTS system_price_aud NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS system_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS budget_aud NUMERIC(12,2);

-- 2. Add deposit, deposit_aud, deposit_received_date, sale_date, and system_price_aud to public.projects
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS deposit_aud NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS deposit NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS deposit_received_date DATE,
  ADD COLUMN IF NOT EXISTS sale_date DATE,
  ADD COLUMN IF NOT EXISTS system_price_aud NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS system_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS budget_aud NUMERIC(12,2);

-- 3. Backfill leads: extract dates & deposit from metadata JSONB if present
UPDATE public.leads
SET 
  sale_date = CASE 
    WHEN sale_date IS NULL AND metadata->>'sale_date' ~ '^\d{4}-\d{2}-\d{2}' THEN (metadata->>'sale_date')::DATE 
    ELSE sale_date 
  END,
  deposit_received_date = CASE 
    WHEN deposit_received_date IS NULL AND metadata->>'deposit_received_date' ~ '^\d{4}-\d{2}-\d{2}' THEN (metadata->>'deposit_received_date')::DATE 
    ELSE deposit_received_date 
  END,
  deposit_aud = CASE
    WHEN deposit_aud IS NULL AND metadata->>'deposit_aud' ~ '^[0-9.]+$' THEN (metadata->>'deposit_aud')::NUMERIC 
    ELSE deposit_aud
  END,
  deposit = CASE
    WHEN deposit IS NULL AND metadata->>'deposit' ~ '^[0-9.]+$' THEN (metadata->>'deposit')::NUMERIC 
    ELSE deposit
  END,
  system_price_aud = CASE
    WHEN system_price_aud IS NULL AND metadata->>'system_price_aud' ~ '^[0-9.]+$' THEN (metadata->>'system_price_aud')::NUMERIC 
    ELSE system_price_aud
  END
WHERE metadata IS NOT NULL;

-- 3. Backfill leads: system_price_aud and budget_aud from each other
UPDATE public.leads 
SET system_price_aud = COALESCE(system_price_aud, budget_aud, system_price)
WHERE system_price_aud IS NULL AND (budget_aud IS NOT NULL OR system_price IS NOT NULL);

UPDATE public.leads 
SET budget_aud = COALESCE(budget_aud, system_price_aud, system_price)
WHERE budget_aud IS NULL AND (system_price_aud IS NOT NULL OR system_price IS NOT NULL);

-- 4. Backfill leads: deposit_aud and deposit from each other
UPDATE public.leads 
SET deposit_aud = COALESCE(deposit_aud, deposit)
WHERE deposit_aud IS NULL AND deposit IS NOT NULL;

UPDATE public.leads 
SET deposit = COALESCE(deposit, deposit_aud)
WHERE deposit IS NULL AND deposit_aud IS NOT NULL;

-- 5. Backfill projects: system_price_aud and total_price
UPDATE public.projects 
SET system_price_aud = COALESCE(system_price_aud, system_price, total_price)
WHERE system_price_aud IS NULL AND (system_price IS NOT NULL OR total_price IS NOT NULL);

UPDATE public.projects 
SET budget_aud = COALESCE(budget_aud, system_price_aud, total_price)
WHERE budget_aud IS NULL AND (system_price_aud IS NOT NULL OR total_price IS NOT NULL);

-- 6. Backfill projects: deposit_aud and deposit_paid
UPDATE public.projects 
SET deposit_aud = COALESCE(deposit_aud, deposit, deposit_paid)
WHERE deposit_aud IS NULL AND (deposit IS NOT NULL OR deposit_paid IS NOT NULL);

UPDATE public.projects 
SET deposit = COALESCE(deposit, deposit_aud, deposit_paid)
WHERE deposit IS NULL AND (deposit_aud IS NOT NULL OR deposit_paid IS NOT NULL);

-- 7. Bidirectional synchronization trigger for leads (system_price_aud <-> budget_aud & deposit_aud <-> deposit)
CREATE OR REPLACE FUNCTION public.sync_lead_financial_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync system_price_aud and budget_aud
  IF NEW.system_price_aud IS NOT NULL AND (OLD.system_price_aud IS NULL OR NEW.system_price_aud <> OLD.system_price_aud) THEN
    NEW.budget_aud := NEW.system_price_aud;
  ELSIF NEW.budget_aud IS NOT NULL AND (OLD.budget_aud IS NULL OR NEW.budget_aud <> OLD.budget_aud) THEN
    NEW.system_price_aud := NEW.budget_aud;
  END IF;

  -- Sync deposit_aud and deposit
  IF NEW.deposit_aud IS NOT NULL AND (OLD.deposit_aud IS NULL OR NEW.deposit_aud <> OLD.deposit_aud) THEN
    NEW.deposit := NEW.deposit_aud;
  ELSIF NEW.deposit IS NOT NULL AND (OLD.deposit IS NULL OR NEW.deposit <> OLD.deposit) THEN
    NEW.deposit_aud := NEW.deposit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_lead_financials ON public.leads;
CREATE TRIGGER trg_sync_lead_financials
BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.sync_lead_financial_fields();

-- 8. Reload PostgREST schema cache so new columns are immediately queryable
NOTIFY pgrst, 'reload schema';
