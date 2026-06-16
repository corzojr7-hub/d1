-- =============================================================================
-- ACTUALIZACIÓN CRÍTICA DE SEGURIDAD RLS - SISTEMA DE CONTROL OPERATIVO
-- =============================================================================

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

-- 2. Limpieza de Políticas Inseguras (Drop)
-- =============================================================================
DO $$ 
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
END $$;


-- 3. Nuevas Políticas Restrictivas (Aislamiento por Tienda)
-- =============================================================================

-- PROFILES (Solo ver perfiles de tu misma tienda)
CREATE POLICY "profiles_select_own_store" ON public.profiles FOR SELECT
USING ( auth.uid() IS NOT NULL AND store_code = public.current_store_code() );

CREATE POLICY "profiles_insert_own_store" ON public.profiles FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND store_code = public.current_store_code() );

CREATE POLICY "profiles_update_own_store" ON public.profiles FOR UPDATE
USING ( auth.uid() IS NOT NULL AND store_code = public.current_store_code() );

CREATE POLICY "profiles_delete_restrict" ON public.profiles AS RESTRICTIVE FOR DELETE USING (false);

-- INSTRUCTIONS
CREATE POLICY "instructions_select_own_store" ON public.instructions FOR SELECT
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND created_by IN (SELECT id FROM public.profiles WHERE store_code = public.current_store_code()) );

CREATE POLICY "instructions_insert_own_store" ON public.instructions FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND created_by = public.current_app_profile_id() );

CREATE POLICY "instructions_update_own_store" ON public.instructions FOR UPDATE
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND created_by IN (SELECT id FROM public.profiles WHERE store_code = public.current_store_code()) );

CREATE POLICY "instructions_delete_restrict" ON public.instructions AS RESTRICTIVE FOR DELETE USING (false);

-- WASTE RECORDS (Añadir store_code a la tabla si no existe, por ahora asumimos filtrado via created_by profile)
ALTER TABLE public.waste_records ADD COLUMN IF NOT EXISTS store_code text;
-- Actualizar histórico para que coincida con el store_code de quien lo creó
UPDATE public.waste_records w SET store_code = (SELECT store_code FROM public.profiles p WHERE p.id = w.created_by) WHERE store_code IS NULL;

CREATE POLICY "waste_records_select_own_store" ON public.waste_records FOR SELECT
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "waste_records_insert_own_store" ON public.waste_records FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "waste_records_update_own_store" ON public.waste_records FOR UPDATE
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "waste_records_delete_restrict" ON public.waste_records AS RESTRICTIVE FOR DELETE USING (false);


-- AUDITS (Checklists)
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS store_code text;
UPDATE public.audits a SET store_code = (SELECT store_code FROM public.profiles p WHERE p.id = a.created_by) WHERE store_code IS NULL;

CREATE POLICY "audits_select_own_store" ON public.audits FOR SELECT
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "audits_insert_own_store" ON public.audits FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "audits_update_own_store" ON public.audits FOR UPDATE
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "audits_delete_restrict" ON public.audits AS RESTRICTIVE FOR DELETE USING (false);


-- PRODUCTS (Catálogo)
-- Los productos son globales, todos los usuarios activos pueden verlos
CREATE POLICY "products_select_global" ON public.products FOR SELECT
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() );

CREATE POLICY "products_insert_global" ON public.products FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.is_active_app_user() );

CREATE POLICY "products_update_global" ON public.products FOR UPDATE
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() );


-- SHIFT HANDOVERS
CREATE POLICY "handovers_select_own_store" ON public.shift_handovers FOR SELECT
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND profile_id IN (SELECT id FROM public.profiles WHERE store_code = public.current_store_code()) );

CREATE POLICY "handovers_insert_own_store" ON public.shift_handovers FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND profile_id = public.current_app_profile_id() );

CREATE POLICY "handovers_update_own_store" ON public.shift_handovers FOR UPDATE
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND profile_id IN (SELECT id FROM public.profiles WHERE store_code = public.current_store_code()) );

CREATE POLICY "handovers_delete_restrict" ON public.shift_handovers AS RESTRICTIVE FOR DELETE USING (false);


-- IMPULSE RECORDS
ALTER TABLE public.impulse_records ADD COLUMN IF NOT EXISTS store_code text;
UPDATE public.impulse_records i SET store_code = (SELECT store_code FROM public.profiles p WHERE p.id = i.created_by) WHERE store_code IS NULL;

CREATE POLICY "impulse_select_own_store" ON public.impulse_records FOR SELECT
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "impulse_insert_own_store" ON public.impulse_records FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "impulse_update_own_store" ON public.impulse_records FOR UPDATE
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );


-- FEFO RECORDS
ALTER TABLE public.fefo_records ADD COLUMN IF NOT EXISTS store_code text;
UPDATE public.fefo_records f SET store_code = (SELECT store_code FROM public.profiles p WHERE p.id = f.created_by) WHERE store_code IS NULL;

CREATE POLICY "fefo_select_own_store" ON public.fefo_records FOR SELECT
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "fefo_insert_own_store" ON public.fefo_records FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "fefo_update_own_store" ON public.fefo_records FOR UPDATE
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );


-- 4. Storage Buckets (Privacidad)
-- =============================================================================
UPDATE storage.buckets SET public = false WHERE id IN ('waste-evidence', 'handover_photos');

-- Limpiar politicas de storage inseguras
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'Allow%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Nuevas políticas de Storage
CREATE POLICY "waste_evidence_select_store" ON storage.objects FOR SELECT
USING ( bucket_id = 'waste-evidence' AND auth.uid() IS NOT NULL AND public.is_active_app_user() );

CREATE POLICY "waste_evidence_insert_store" ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'waste-evidence' AND auth.uid() IS NOT NULL AND public.is_active_app_user() );

CREATE POLICY "handover_photos_select_store" ON storage.objects FOR SELECT
USING ( bucket_id = 'handover_photos' AND auth.uid() IS NOT NULL AND public.is_active_app_user() );

CREATE POLICY "handover_photos_insert_store" ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'handover_photos' AND auth.uid() IS NOT NULL AND public.is_active_app_user() );
