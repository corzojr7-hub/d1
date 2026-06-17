-- PATCH: Habilitar cuentas individuales y roles segundo/tercero

BEGIN;

-- 1. Actualizar politicas de seguridad para permitir update a segundo y tercero
-- (Reemplazamos las que requerian explicitamente 'supervisor')

DROP POLICY IF EXISTS "waste_records_update_own" ON public.waste_records;
CREATE POLICY "waste_records_update_own" ON public.waste_records FOR UPDATE TO authenticated
USING ( store_code = public.current_store_code() AND public.current_app_role() IN ('supervisor', 'admin', 'segundo', 'tercero') )
WITH CHECK ( store_code = public.current_store_code() AND public.current_app_role() IN ('supervisor', 'admin', 'segundo', 'tercero') );

DROP POLICY IF EXISTS "instructions_update_own" ON public.instructions;
CREATE POLICY "instructions_update_own" ON public.instructions FOR UPDATE TO authenticated
USING ( store_code = public.current_store_code() AND public.current_app_role() IN ('supervisor', 'admin', 'segundo', 'tercero') )
WITH CHECK ( store_code = public.current_store_code() AND public.current_app_role() IN ('supervisor', 'admin', 'segundo', 'tercero') );

DROP POLICY IF EXISTS "audits_update_own" ON public.audits;
CREATE POLICY "audits_update_own" ON public.audits FOR UPDATE TO authenticated
USING ( store_code = public.current_store_code() AND public.current_app_role() IN ('supervisor', 'admin', 'segundo', 'tercero') )
WITH CHECK ( store_code = public.current_store_code() AND public.current_app_role() IN ('supervisor', 'admin', 'segundo', 'tercero') );

DROP POLICY IF EXISTS "daily_basics_update_own" ON public.daily_basics;
CREATE POLICY "daily_basics_update_own" ON public.daily_basics FOR UPDATE TO authenticated
USING ( store_code = public.current_store_code() AND public.current_app_role() IN ('supervisor', 'admin', 'segundo', 'tercero') )
WITH CHECK ( store_code = public.current_store_code() AND public.current_app_role() IN ('supervisor', 'admin', 'segundo', 'tercero') );

DROP POLICY IF EXISTS "pos_metrics_update_own" ON public.pos_metrics;
CREATE POLICY "pos_metrics_update_own" ON public.pos_metrics FOR UPDATE TO authenticated
USING ( store_code = public.current_store_code() AND public.current_app_role() IN ('supervisor', 'admin', 'segundo', 'tercero') )
WITH CHECK ( store_code = public.current_store_code() AND public.current_app_role() IN ('supervisor', 'admin', 'segundo', 'tercero') );

DROP POLICY IF EXISTS "impulse_records_update_own" ON public.impulse_records;
CREATE POLICY "impulse_records_update_own" ON public.impulse_records FOR UPDATE TO authenticated
USING ( store_code = public.current_store_code() AND public.current_app_role() IN ('supervisor', 'admin', 'segundo', 'tercero') )
WITH CHECK ( store_code = public.current_store_code() AND public.current_app_role() IN ('supervisor', 'admin', 'segundo', 'tercero') );

DROP POLICY IF EXISTS "shift_handovers_update_own" ON public.shift_handovers;
CREATE POLICY "shift_handovers_update_own" ON public.shift_handovers FOR UPDATE TO authenticated
USING ( store_code = public.current_store_code() AND public.current_app_role() IN ('supervisor', 'admin', 'segundo', 'tercero') )
WITH CHECK ( store_code = public.current_store_code() AND public.current_app_role() IN ('supervisor', 'admin', 'segundo', 'tercero') );

COMMIT;
