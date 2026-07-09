BEGIN;

CREATE OR REPLACE FUNCTION public.security_current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
    AND p.status = 'activo'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.security_current_store_code()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.store_code
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
    AND p.status = 'activo'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.security_current_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
    AND p.status = 'activo'
  LIMIT 1
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sales ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.waste_records FORCE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sales FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS security_profiles_select ON public.profiles;
DROP POLICY IF EXISTS security_profiles_update ON public.profiles;
DROP POLICY IF EXISTS security_waste_select ON public.waste_records;
DROP POLICY IF EXISTS security_waste_insert ON public.waste_records;
DROP POLICY IF EXISTS security_waste_update ON public.waste_records;
DROP POLICY IF EXISTS security_sales_select ON public.daily_sales;
DROP POLICY IF EXISTS security_sales_insert ON public.daily_sales;
DROP POLICY IF EXISTS security_sales_update ON public.daily_sales;

CREATE POLICY security_profiles_select
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.security_current_app_role() = 'admin'
  OR user_id = auth.uid()
  OR store_code = public.security_current_store_code()
);

CREATE POLICY security_profiles_update
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND store_code = public.security_current_store_code()
  AND role = public.security_current_app_role()
);

CREATE POLICY security_waste_select
ON public.waste_records
FOR SELECT
TO authenticated
USING (
  public.security_current_app_role() = 'admin'
  OR store_code = public.security_current_store_code()
);

CREATE POLICY security_waste_insert
ON public.waste_records
FOR INSERT
TO authenticated
WITH CHECK (
  store_code = public.security_current_store_code()
  AND created_by = public.security_current_profile_id()
);

CREATE POLICY security_waste_update
ON public.waste_records
FOR UPDATE
TO authenticated
USING (
  public.security_current_app_role() = 'admin'
  OR store_code = public.security_current_store_code()
)
WITH CHECK (
  public.security_current_app_role() = 'admin'
  OR store_code = public.security_current_store_code()
);

CREATE POLICY security_sales_select
ON public.daily_sales
FOR SELECT
TO authenticated
USING (
  public.security_current_app_role() = 'admin'
  OR store_code = public.security_current_store_code()
);

CREATE POLICY security_sales_insert
ON public.daily_sales
FOR INSERT
TO authenticated
WITH CHECK (
  store_code = public.security_current_store_code()
  AND (
    created_by IS NULL
    OR created_by = public.security_current_profile_id()
  )
);

CREATE POLICY security_sales_update
ON public.daily_sales
FOR UPDATE
TO authenticated
USING (
  public.security_current_app_role() = 'admin'
  OR store_code = public.security_current_store_code()
)
WITH CHECK (
  public.security_current_app_role() = 'admin'
  OR store_code = public.security_current_store_code()
);

COMMIT;
