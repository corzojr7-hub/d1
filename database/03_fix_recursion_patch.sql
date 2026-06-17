-- 1. Eliminar la politica problematica que causa recursion infinita
DROP POLICY IF EXISTS "profiles_select_own_store" ON profiles;

-- 2. Crear funcion bypass para el store_code
CREATE OR REPLACE FUNCTION get_auth_store_code()
RETURNS text AS $$$
  SELECT store_code FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 3. Crear nueva politica limpia
CREATE POLICY "profiles_select_own_store" ON profiles
    FOR SELECT 
    USING (
        user_id = auth.uid() OR store_code = get_auth_store_code()
    );
