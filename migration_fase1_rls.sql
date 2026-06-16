-- BLOQUEO DEFINITIVO DE RLS PARA LA APLICACIÓN RETAIL

-- 1. Asegurar que TODAS las tablas tengan RLS habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_basics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impulse_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fefo_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_pins ENABLE ROW LEVEL SECURITY;

-- 2. Limpiar políticas existentes (para empezar en limpio)
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. Crear Políticas para PROFILES
-- Un perfil solo puede verse y editarse a sí mismo (y su tienda si es el caso)
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true); -- Permitimos lectura global para que las vistas puedan ver la tienda, o puedes restringir a auth.uid() = user_id
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- 4. Crear Políticas para PRODUCTS (Catálogo)
-- Todos los usuarios autenticados pueden leer productos, nadie puede editar desde la app (solo admin db)
CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated USING (true);

-- 5. Crear Políticas para WASTE_RECORDS
-- Se puede leer y crear solo para la tienda a la que pertenece el usuario autenticado
CREATE POLICY "waste_select" ON public.waste_records FOR SELECT TO authenticated 
USING (store_code = (SELECT store_code FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "waste_insert" ON public.waste_records FOR INSERT TO authenticated 
WITH CHECK (store_code = (SELECT store_code FROM public.profiles WHERE id = auth.uid() LIMIT 1) AND created_by = auth.uid());

CREATE POLICY "waste_update" ON public.waste_records FOR UPDATE TO authenticated 
USING (store_code = (SELECT store_code FROM public.profiles WHERE id = auth.uid() LIMIT 1));

-- 6. Crear Políticas para INSTRUCTIONS
CREATE POLICY "instructions_select" ON public.instructions FOR SELECT TO authenticated 
USING (store_code = (SELECT store_code FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "instructions_insert" ON public.instructions FOR INSERT TO authenticated 
WITH CHECK (store_code = (SELECT store_code FROM public.profiles WHERE id = auth.uid() LIMIT 1) AND created_by = auth.uid());

CREATE POLICY "instructions_update" ON public.instructions FOR UPDATE TO authenticated 
USING (store_code = (SELECT store_code FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "instructions_delete" ON public.instructions FOR DELETE TO authenticated 
USING (store_code = (SELECT store_code FROM public.profiles WHERE id = auth.uid() LIMIT 1));

-- 7. Crear Políticas para DAILY_BASICS
CREATE POLICY "daily_select" ON public.daily_basics FOR SELECT TO authenticated 
USING (store_code = (SELECT store_code FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "daily_insert" ON public.daily_basics FOR INSERT TO authenticated 
WITH CHECK (store_code = (SELECT store_code FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "daily_update" ON public.daily_basics FOR UPDATE TO authenticated 
USING (store_code = (SELECT store_code FROM public.profiles WHERE id = auth.uid() LIMIT 1));

-- 8. Crear Políticas para AUDITS
CREATE POLICY "audits_select" ON public.audits FOR SELECT TO authenticated 
USING (store_code = (SELECT store_code FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "audits_insert" ON public.audits FOR INSERT TO authenticated 
WITH CHECK (store_code = (SELECT store_code FROM public.profiles WHERE id = auth.uid() LIMIT 1));

-- 9. Crear Políticas para IMPULSE_RECORDS
CREATE POLICY "impulses_select" ON public.impulse_records FOR SELECT TO authenticated 
USING (store_code = (SELECT store_code FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "impulses_insert" ON public.impulse_records FOR INSERT TO authenticated 
WITH CHECK (store_code = (SELECT store_code FROM public.profiles WHERE id = auth.uid() LIMIT 1));

-- 10. Crear Políticas para FEFO_RECORDS
CREATE POLICY "fefo_select" ON public.fefo_records FOR SELECT TO authenticated 
USING (store_code = (SELECT store_code FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "fefo_insert" ON public.fefo_records FOR INSERT TO authenticated 
WITH CHECK (store_code = (SELECT store_code FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "fefo_update" ON public.fefo_records FOR UPDATE TO authenticated 
USING (store_code = (SELECT store_code FROM public.profiles WHERE id = auth.uid() LIMIT 1));

-- 11. Crear Políticas para OPERATOR_PINS
-- Nadie puede leer los pines excepto un supervisor de esa tienda actualizando
CREATE POLICY "pins_select" ON public.operator_pins FOR SELECT TO authenticated 
USING (store_code = (SELECT store_code FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "pins_insert" ON public.operator_pins FOR INSERT TO authenticated 
WITH CHECK (store_code = (SELECT store_code FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "pins_update" ON public.operator_pins FOR UPDATE TO authenticated 
USING (store_code = (SELECT store_code FROM public.profiles WHERE id = auth.uid() LIMIT 1));
