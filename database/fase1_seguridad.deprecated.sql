-- =============================================================================
-- ACTUALIZACIÓN CRÍTICA DE SEGURIDAD RLS - FASE 1
-- =============================================================================
-- Instrucciones:
-- Copia todo este código y pégalo en la pestaña "SQL Editor" de tu proyecto 
-- de Supabase, y haz clic en "RUN". 
-- (Asegúrate de que no lance errores rojos, lee la salida verde abajo).

-- 1. Helper Functions (Seguridad y Aislamiento por Tienda)
-- =============================================================================

-- Retorna el store_code de la tienda del usuario autenticado
CREATE OR REPLACE FUNCTION public.current_store_code()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT p.store_code
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
    AND p.status = 'activo'
  LIMIT 1;
$$;

-- Retorna el id del perfil activo del usuario autenticado
CREATE OR REPLACE FUNCTION public.current_app_profile_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT p.id
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.status = 'activo'
    LIMIT 1;
$$;

-- Retorna el rol del usuario autenticado
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT p.role
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.status = 'activo'
    LIMIT 1;
$$;

-- Retorna true si el usuario tiene un perfil activo
CREATE OR REPLACE FUNCTION public.is_active_app_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT exists (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.status = 'activo'
    );
$$;

-- 2. Limpieza Absoluta de Políticas Existentes
-- =============================================================================
-- Borramos las políticas "zombies" asegurando una tabla blanca
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN (
        'profiles', 'instructions', 'products', 'waste_records', 
        'audits', 'daily_basics', 'pos_metrics', 'push_subscriptions'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;


-- 3. Habilitación Obligatoria de RLS y Tablas Olvidadas
-- =============================================================================

-- Asegurarse de que las tablas recientes tengan store_code
ALTER TABLE IF EXISTS public.audits ADD COLUMN IF NOT EXISTS store_code text NOT NULL DEFAULT '';
ALTER TABLE IF EXISTS public.daily_basics ADD COLUMN IF NOT EXISTS store_code text NOT NULL DEFAULT '';
ALTER TABLE IF EXISTS public.pos_metrics ADD COLUMN IF NOT EXISTS store_code text NOT NULL DEFAULT '';

-- Habilitar RLS en TODO
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_basics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;


-- 4. Creación del Trigger "Inyectable" Enforce Store Code
-- =============================================================================
-- Esta función sobreescribe silenciosamente cualquier store_code que mande la API
-- garantizando que un hacker NO pueda guardar en la tienda de otros.
CREATE OR REPLACE FUNCTION public.enforce_store_code()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_code text;
BEGIN
  v_store_code := public.current_store_code();
  IF v_store_code IS NOT NULL AND v_store_code != '' THEN
    NEW.store_code := v_store_code;
  END IF;
  RETURN NEW;
END;
$$;

-- Aplicar el trigger a las tablas que usan store_code
DROP TRIGGER IF EXISTS trg_enforce_store_code_profiles ON public.profiles;
-- En profiles no aplicamos enforce para evitar loops, su store_code viene del admin.

DROP TRIGGER IF EXISTS trg_enforce_store_code_waste ON public.waste_records;
CREATE TRIGGER trg_enforce_store_code_waste BEFORE INSERT OR UPDATE ON public.waste_records FOR EACH ROW EXECUTE FUNCTION public.enforce_store_code();

DROP TRIGGER IF EXISTS trg_enforce_store_code_audits ON public.audits;
CREATE TRIGGER trg_enforce_store_code_audits BEFORE INSERT OR UPDATE ON public.audits FOR EACH ROW EXECUTE FUNCTION public.enforce_store_code();

DROP TRIGGER IF EXISTS trg_enforce_store_code_daily ON public.daily_basics;
CREATE TRIGGER trg_enforce_store_code_daily BEFORE INSERT OR UPDATE ON public.daily_basics FOR EACH ROW EXECUTE FUNCTION public.enforce_store_code();

DROP TRIGGER IF EXISTS trg_enforce_store_code_pos ON public.pos_metrics;
CREATE TRIGGER trg_enforce_store_code_pos BEFORE INSERT OR UPDATE ON public.pos_metrics FOR EACH ROW EXECUTE FUNCTION public.enforce_store_code();


-- 5. Nuevas Políticas Restrictivas Seguras
-- =============================================================================

-- ----------------------------------------
-- PROFILES (Aislamiento Total)
-- ----------------------------------------
CREATE POLICY "profiles_select_own_store" ON public.profiles FOR SELECT
USING ( auth.uid() IS NOT NULL AND store_code = public.current_store_code() );

CREATE POLICY "profiles_update_own_store" ON public.profiles FOR UPDATE
USING ( auth.uid() IS NOT NULL AND store_code = public.current_store_code() );

CREATE POLICY "profiles_delete_restrict" ON public.profiles AS RESTRICTIVE FOR DELETE USING (false);

-- ----------------------------------------
-- INSTRUCTIONS (Aislamiento Total)
-- ----------------------------------------
CREATE POLICY "instructions_select_own_store" ON public.instructions FOR SELECT
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND created_by IN (SELECT id FROM public.profiles WHERE store_code = public.current_store_code()) );

CREATE POLICY "instructions_insert_own_store" ON public.instructions FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND created_by = public.current_app_profile_id() );

CREATE POLICY "instructions_update_own_store" ON public.instructions FOR UPDATE
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND created_by IN (SELECT id FROM public.profiles WHERE store_code = public.current_store_code()) );

-- ----------------------------------------
-- PRODUCTS (Catálogo Bloqueado - Solo Admins Editan)
-- ----------------------------------------
CREATE POLICY "products_select_authenticated" ON public.products FOR SELECT
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() );

CREATE POLICY "products_insert_admin_only" ON public.products FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.current_app_role() = 'admin' );

CREATE POLICY "products_update_admin_only" ON public.products FOR UPDATE
USING ( auth.uid() IS NOT NULL AND public.current_app_role() = 'admin' );

CREATE POLICY "products_delete_admin_only" ON public.products FOR DELETE
USING ( auth.uid() IS NOT NULL AND public.current_app_role() = 'admin' );

-- ----------------------------------------
-- WASTE RECORDS (Aislamiento Total)
-- ----------------------------------------
CREATE POLICY "waste_records_select_store" ON public.waste_records FOR SELECT
USING ( auth.uid() IS NOT NULL AND store_code = public.current_store_code() );

CREATE POLICY "waste_records_insert_store" ON public.waste_records FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "waste_records_update_store" ON public.waste_records FOR UPDATE
USING ( auth.uid() IS NOT NULL AND store_code = public.current_store_code() );

-- ----------------------------------------
-- AUDITS / CHECKLISTS (Aislamiento Total)
-- ----------------------------------------
CREATE POLICY "audits_select_store" ON public.audits FOR SELECT
USING ( auth.uid() IS NOT NULL AND store_code = public.current_store_code() );

CREATE POLICY "audits_insert_store" ON public.audits FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "audits_update_store" ON public.audits FOR UPDATE
USING ( auth.uid() IS NOT NULL AND store_code = public.current_store_code() );

-- ----------------------------------------
-- DAILY BASICS (Aislamiento Total)
-- ----------------------------------------
CREATE POLICY "daily_basics_select_store" ON public.daily_basics FOR SELECT
USING ( auth.uid() IS NOT NULL AND store_code = public.current_store_code() );

CREATE POLICY "daily_basics_insert_store" ON public.daily_basics FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "daily_basics_update_store" ON public.daily_basics FOR UPDATE
USING ( auth.uid() IS NOT NULL AND store_code = public.current_store_code() );

-- ----------------------------------------
-- POS METRICS (Aislamiento Total)
-- ----------------------------------------
CREATE POLICY "pos_metrics_select_store" ON public.pos_metrics FOR SELECT
USING ( auth.uid() IS NOT NULL AND store_code = public.current_store_code() );

CREATE POLICY "pos_metrics_insert_store" ON public.pos_metrics FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "pos_metrics_update_store" ON public.pos_metrics FOR UPDATE
USING ( auth.uid() IS NOT NULL AND store_code = public.current_store_code() );

-- ----------------------------------------
-- PUSH SUBSCRIPTIONS (Aislamiento Total)
-- ----------------------------------------
CREATE POLICY "push_subscriptions_select_own" ON public.push_subscriptions FOR SELECT
USING ( auth.uid() IS NOT NULL AND user_id = auth.uid() );

CREATE POLICY "push_subscriptions_insert_own" ON public.push_subscriptions FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND user_id = auth.uid() );

CREATE POLICY "push_subscriptions_update_own" ON public.push_subscriptions FOR UPDATE
USING ( auth.uid() IS NOT NULL AND user_id = auth.uid() );

CREATE POLICY "push_subscriptions_delete_own" ON public.push_subscriptions FOR DELETE
USING ( auth.uid() IS NOT NULL AND user_id = auth.uid() );

-- LISTO! La base de datos es ahora altamente segura e inyectable.
