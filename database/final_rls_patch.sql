-- PARCHE FINAL DE SEGURIDAD RLS (Fase 2)
-- Añade políticas RLS estrictas a las tablas restantes para asegurar aislamiento multi-tenant.

BEGIN;

-- 1. Añadir store_code a las tablas que no lo tenían
ALTER TABLE public.shift_handovers ADD COLUMN IF NOT EXISTS store_code text;
ALTER TABLE public.weekly_schedules ADD COLUMN IF NOT EXISTS store_code text;

-- 2. Asegurarse de que las tablas reales tengan RLS habilitado
ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Crear Políticas de Aislamiento por Tienda
-- (Los usuarios solo ven lo de su tienda)

-- shift_handovers
DROP POLICY IF EXISTS "shift_handovers_select" ON public.shift_handovers;
CREATE POLICY "shift_handovers_select" ON public.shift_handovers FOR SELECT TO authenticated
USING ( store_code = public.current_store_code() OR public.current_app_role() = 'admin' );

DROP POLICY IF EXISTS "shift_handovers_insert" ON public.shift_handovers;
CREATE POLICY "shift_handovers_insert" ON public.shift_handovers FOR INSERT TO authenticated
WITH CHECK ( store_code = public.current_store_code() );

-- weekly_schedules
DROP POLICY IF EXISTS "weekly_schedules_select" ON public.weekly_schedules;
CREATE POLICY "weekly_schedules_select" ON public.weekly_schedules FOR SELECT TO authenticated
USING ( store_code = public.current_store_code() OR public.current_app_role() = 'admin' );

DROP POLICY IF EXISTS "weekly_schedules_insert" ON public.weekly_schedules;
CREATE POLICY "weekly_schedules_insert" ON public.weekly_schedules FOR INSERT TO authenticated
WITH CHECK ( store_code = public.current_store_code() );

-- push_subscriptions (usa user_id directo)
DROP POLICY IF EXISTS "push_subscriptions_select" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_select" ON public.push_subscriptions FOR SELECT TO authenticated
USING ( user_id = auth.uid() OR public.current_app_role() = 'admin' );

DROP POLICY IF EXISTS "push_subscriptions_insert" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_insert" ON public.push_subscriptions FOR INSERT TO authenticated
WITH CHECK ( user_id = auth.uid() );

-- admin_audit_logs
DROP POLICY IF EXISTS "admin_audit_logs_select" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_select" ON public.admin_audit_logs FOR SELECT TO authenticated
USING ( public.current_app_role() = 'admin' );

-- Eliminar lectura global de profiles si existía, reemplazándola por tienda+admin
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select_own_store" ON public.profiles FOR SELECT TO authenticated
USING (
  store_code = public.current_store_code()
  OR public.current_app_role() = 'admin'
);

COMMIT;
