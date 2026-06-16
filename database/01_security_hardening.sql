-- PARCHE DE HARDENING DE SEGURIDAD (Post-Auditoría)

BEGIN;

-- 1. IDENTIDAD DE ASISTENTES: PINs
-- Agregamos la columna operator_pins al perfil (JSONB). 
-- Formato: { "Nombre": "1234", "Nombre 2": "5678" }
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS operator_pins jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. LIMITACIÓN DE TASA (Rate Limiting) EN BD
-- Protege endpoints sensibles como login y OpenAI/Gemini
CREATE TABLE IF NOT EXISTS public.rate_limits (
    ip text NOT NULL,
    action text NOT NULL,
    window_start timestamp with time zone NOT NULL,
    hits integer NOT NULL DEFAULT 1,
    PRIMARY KEY (ip, action, window_start)
);
-- Índice para limpieza rápida
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON public.rate_limits(window_start);

-- Opcional: limpiar registros viejos (se puede llamar desde un cron o trigger)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits() RETURNS void AS $$
BEGIN
    DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;

-- 3. CERRAR BRECHAS EN RLS (Solo Dueño o Supervisor puede actualizar)
-- waste_records
DROP POLICY IF EXISTS "waste_records_update" ON public.waste_records;
CREATE POLICY "waste_records_update_own" ON public.waste_records FOR UPDATE TO authenticated
USING (
    created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.current_app_role() IN ('supervisor', 'admin')
);

-- instructions
DROP POLICY IF EXISTS "instructions_update" ON public.instructions;
CREATE POLICY "instructions_update_own" ON public.instructions FOR UPDATE TO authenticated
USING (
    created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.current_app_role() IN ('supervisor', 'admin')
);

-- audits
DROP POLICY IF EXISTS "audits_update" ON public.audits;
CREATE POLICY "audits_update_own" ON public.audits FOR UPDATE TO authenticated
USING (
    created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.current_app_role() IN ('supervisor', 'admin')
);

-- daily_basics
DROP POLICY IF EXISTS "daily_basics_update" ON public.daily_basics;
CREATE POLICY "daily_basics_update_own" ON public.daily_basics FOR UPDATE TO authenticated
USING (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.current_app_role() IN ('supervisor', 'admin')
);

-- pos_metrics
DROP POLICY IF EXISTS "pos_metrics_update" ON public.pos_metrics;
CREATE POLICY "pos_metrics_update_own" ON public.pos_metrics FOR UPDATE TO authenticated
USING (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.current_app_role() IN ('supervisor', 'admin')
);

-- impulse_records
DROP POLICY IF EXISTS "impulse_records_update" ON public.impulse_records;
CREATE POLICY "impulse_records_update_own" ON public.impulse_records FOR UPDATE TO authenticated
USING (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.current_app_role() IN ('supervisor', 'admin')
);

-- shift_handovers
DROP POLICY IF EXISTS "shift_handovers_update" ON public.shift_handovers;
CREATE POLICY "shift_handovers_update_own" ON public.shift_handovers FOR UPDATE TO authenticated
USING (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.current_app_role() IN ('supervisor', 'admin')
);

-- Corregir vulnerability de actualización de perfiles (email/fullname)
-- Asegurar que el usuario SOLO pueda actualizar su propio perfil de verdad
DROP POLICY IF EXISTS "profiles_update_own_display_name_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_store" ON public.profiles;

CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
USING ( user_id = auth.uid() )
WITH CHECK ( user_id = auth.uid() );

COMMIT;
