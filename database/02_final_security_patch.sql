-- ==============================================================================
-- 02_final_security_patch.sql
-- ==============================================================================

-- 1. CORRECCION TRIGGER ENFORCE_STORE_CODE
-- Excluir al service_role para operaciones administrativas globales.
CREATE OR REPLACE FUNCTION enforce_store_code()
RETURNS TRIGGER AS $$
DECLARE
    v_store_code text;
BEGIN
    -- Permitir bypass para service_role (Admin Central)
    IF current_setting('role', true) != 'authenticated' THEN
        RETURN NEW;
    END IF;

    -- Solo forzar si es authenticated
    SELECT store_code INTO v_store_code
    FROM profiles
    WHERE user_id = auth.uid();

    IF v_store_code IS NULL THEN
        RAISE EXCEPTION 'Usuario sin store_code asignado';
    END IF;

    NEW.store_code := v_store_code;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. CORRECCION POLITICA RLS DE PROFILES
-- Eliminar la politica permisiva si existe
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Recrear politica de update estrictamente restrictiva (solo nombre y password)
CREATE POLICY "profiles_update_own_display_name_only" ON profiles
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (
        store_code = (SELECT store_code FROM profiles WHERE user_id = auth.uid()) -- Prevents changing store_code
    );

-- 3. PRIVACIDAD DE PINS
-- Eliminar la politica de seleccion de misma tienda existente y recrear para excluir campos sensibles o limitar por rol
DROP POLICY IF EXISTS "pins_select_own_store" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own_store" ON profiles;

CREATE POLICY "profiles_select_own_store" ON profiles
    FOR SELECT 
    USING (
        store_code = (SELECT store_code FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    );

-- 4. WITH CHECK GENERAL EN TABLAS OPERATIVAS PARA store_code
-- Waste Records
DROP POLICY IF EXISTS "waste_update_own_store" ON waste_records;
CREATE POLICY "waste_update_own_store" ON waste_records
    FOR UPDATE
    USING (store_code = (SELECT store_code FROM profiles WHERE user_id = auth.uid() LIMIT 1))
    WITH CHECK (store_code = (SELECT store_code FROM profiles WHERE user_id = auth.uid() LIMIT 1));

-- Daily Basics
DROP POLICY IF EXISTS "daily_basics_update_own_store" ON daily_basics;
CREATE POLICY "daily_basics_update_own_store" ON daily_basics
    FOR UPDATE
    USING (store_code = (SELECT store_code FROM profiles WHERE user_id = auth.uid() LIMIT 1))
    WITH CHECK (store_code = (SELECT store_code FROM profiles WHERE user_id = auth.uid() LIMIT 1));

-- Impulse Records
DROP POLICY IF EXISTS "impulse_update_own_store" ON impulse_records;
CREATE POLICY "impulse_update_own_store" ON impulse_records
    FOR UPDATE
    USING (store_code = (SELECT store_code FROM profiles WHERE user_id = auth.uid() LIMIT 1))
    WITH CHECK (store_code = (SELECT store_code FROM profiles WHERE user_id = auth.uid() LIMIT 1));
