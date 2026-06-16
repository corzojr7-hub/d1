const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../database/schema.sql');
const rlsPath = path.join(__dirname, '../database/rls_policies.sql');
const outPath = path.join(__dirname, '../database/consolidated_schema.sql');

let schema = fs.readFileSync(schemaPath, 'utf8');
let rls = fs.readFileSync(rlsPath, 'utf8');

// Remove all 'Allow authenticated...' policies
schema = schema.replace(/create policy "Allow authenticated[^"]*"\s+on\s+[a-zA-Z_]+\s+for\s+[a-zA-Z]+\s+(using|with check)\s*\([^;]+;/gi, '');
schema = schema.replace(/create policy "Allow public read handover photos"[^;]+;/gi, '');

// Clean up extra blank lines
schema = schema.replace(/\n\s*\n\s*\n/g, '\n\n');

// Re-add safe storage policies
rls = rls.replace(/CREATE POLICY "waste_evidence_select_store"[^;]+;/gi, \`CREATE POLICY "waste_evidence_select_store" ON storage.objects FOR SELECT
USING ( bucket_id = 'waste-evidence' AND auth.uid() IS NOT NULL AND public.is_active_app_user() AND (storage.foldername(name))[1] = public.current_store_code() );\`);

rls = rls.replace(/CREATE POLICY "waste_evidence_insert_store"[^;]+;/gi, \`CREATE POLICY "waste_evidence_insert_store" ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'waste-evidence' AND auth.uid() IS NOT NULL AND public.is_active_app_user() AND (storage.foldername(name))[1] = public.current_store_code() );\`);

// Add handover_photos safe policies if missing
const handoverPolicies = \`
CREATE POLICY "handover_photos_select_store" ON storage.objects FOR SELECT
USING ( bucket_id = 'handover_photos' AND auth.uid() IS NOT NULL AND public.is_active_app_user() AND (storage.foldername(name))[1] = public.current_store_code() );

CREATE POLICY "handover_photos_insert_store" ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'handover_photos' AND auth.uid() IS NOT NULL AND public.is_active_app_user() AND (storage.foldername(name))[1] = public.current_store_code() );
\`;

// Replace DO $$ drop policy loops with safe ones
const dropPoliciesLoop = \`
DO \\\$\\\$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND (policyname LIKE 'Allow authenticated%' OR policyname LIKE 'profiles_%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END \\\$\\\$;
\`;

-- Modificar tablas para asegurar que tengan store_code
ALTER TABLE audits ADD COLUMN IF NOT EXISTS store_code text NOT NULL DEFAULT '';
ALTER TABLE daily_basics ADD COLUMN IF NOT EXISTS store_code text NOT NULL DEFAULT '';
ALTER TABLE impulse_records ADD COLUMN IF NOT EXISTS store_code text NOT NULL DEFAULT '';
ALTER TABLE pos_metrics ADD COLUMN IF NOT EXISTS store_code text NOT NULL DEFAULT '';
ALTER TABLE fefo_records ADD COLUMN IF NOT EXISTS store_code text NOT NULL DEFAULT '';
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS store_code text NOT NULL DEFAULT '';

-- Función para forzar store_code antes de insertar/actualizar
CREATE OR REPLACE FUNCTION public.enforce_store_code()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  NEW.store_code := public.current_store_code();
  IF NEW.store_code IS NULL OR NEW.store_code = '' THEN
    RAISE EXCEPTION 'Usuario sin tienda activa o no autorizado';
  END IF;
  RETURN NEW;
END;
$$;

-- Crear triggers para las tablas operativas
DROP TRIGGER IF EXISTS trg_enforce_store_code_waste ON waste_records;
CREATE TRIGGER trg_enforce_store_code_waste BEFORE INSERT OR UPDATE ON waste_records FOR EACH ROW EXECUTE FUNCTION public.enforce_store_code();

DROP TRIGGER IF EXISTS trg_enforce_store_code_audits ON audits;
CREATE TRIGGER trg_enforce_store_code_audits BEFORE INSERT OR UPDATE ON audits FOR EACH ROW EXECUTE FUNCTION public.enforce_store_code();

DROP TRIGGER IF EXISTS trg_enforce_store_code_fefo ON fefo_records;
CREATE TRIGGER trg_enforce_store_code_fefo BEFORE INSERT OR UPDATE ON fefo_records FOR EACH ROW EXECUTE FUNCTION public.enforce_store_code();

DROP TRIGGER IF EXISTS trg_enforce_store_code_daily ON daily_basics;
CREATE TRIGGER trg_enforce_store_code_daily BEFORE INSERT OR UPDATE ON daily_basics FOR EACH ROW EXECUTE FUNCTION public.enforce_store_code();

DROP TRIGGER IF EXISTS trg_enforce_store_code_pos ON pos_metrics;
CREATE TRIGGER trg_enforce_store_code_pos BEFORE INSERT OR UPDATE ON pos_metrics FOR EACH ROW EXECUTE FUNCTION public.enforce_store_code();

DROP TRIGGER IF EXISTS trg_enforce_store_code_impulse ON impulse_records;
CREATE TRIGGER trg_enforce_store_code_impulse BEFORE INSERT OR UPDATE ON impulse_records FOR EACH ROW EXECUTE FUNCTION public.enforce_store_code();

DROP TRIGGER IF EXISTS trg_enforce_store_code_instructions ON instructions;
-- Instructions created_by acts as isolation but adding store_code is safer:
ALTER TABLE instructions ADD COLUMN IF NOT EXISTS store_code text NOT NULL DEFAULT '';
CREATE TRIGGER trg_enforce_store_code_instructions BEFORE INSERT OR UPDATE ON instructions FOR EACH ROW EXECUTE FUNCTION public.enforce_store_code();


-- =============================================================================
-- POLÍTICAS RLS FALTANTES
-- =============================================================================

-- DAILY BASICS
CREATE POLICY "daily_basics_select_store" ON public.daily_basics FOR SELECT USING (store_code = public.current_store_code());
CREATE POLICY "daily_basics_insert_store" ON public.daily_basics FOR INSERT WITH CHECK (store_code = public.current_store_code());
CREATE POLICY "daily_basics_update_store" ON public.daily_basics FOR UPDATE USING (store_code = public.current_store_code());
CREATE POLICY "daily_basics_delete_restrict" ON public.daily_basics AS RESTRICTIVE FOR DELETE USING (false);

-- POS METRICS
CREATE POLICY "pos_metrics_select_store" ON public.pos_metrics FOR SELECT USING (store_code = public.current_store_code());
CREATE POLICY "pos_metrics_insert_store" ON public.pos_metrics FOR INSERT WITH CHECK (store_code = public.current_store_code());
CREATE POLICY "pos_metrics_update_store" ON public.pos_metrics FOR UPDATE USING (store_code = public.current_store_code());
CREATE POLICY "pos_metrics_delete_restrict" ON public.pos_metrics AS RESTRICTIVE FOR DELETE USING (false);

-- PUSH SUBSCRIPTIONS (Solo el usuario dueño las lee/modifica)
CREATE POLICY "push_subs_select_own" ON public.push_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "push_subs_insert_own" ON public.push_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_subs_update_own" ON public.push_subscriptions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "push_subs_delete_own" ON public.push_subscriptions FOR DELETE USING (user_id = auth.uid());

-- TABLA PRODUCTS (Bloqueada)
DROP POLICY IF EXISTS "products_insert_global" ON public.products;
DROP POLICY IF EXISTS "products_update_global" ON public.products;
DROP POLICY IF EXISTS "products_delete_global" ON public.products;
-- Permanece products_select_global en el rls_policies.sql, los insert/update/delete no tienen policy pública, por ende están denegados.

`;

fs.writeFileSync(outPath, consolidated);
console.log('Generado consolidated_schema.sql');
