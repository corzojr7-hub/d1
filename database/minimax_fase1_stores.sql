-- =============================================================================
-- MINIMAX FASE 1: ENTIDAD TIENDAS Y REFERENCIALIDAD (PONYTAIL MODE)
-- =============================================================================

-- Minimax sugirió crear una tabla `stores` y cambiar `store_code` por `store_id uuid`.
-- Aplicando Ponytail Mode: Cambiar el tipo de dato rompería toda la app. 
-- La solución mínima segura es crear la tabla `stores` usando `code` como PK (o UNIQUE)
-- y añadir Foreign Keys a todas las tablas existentes. 
-- Así logramos 100% de integridad relacional con 0% de refactor en el Frontend.

CREATE TABLE IF NOT EXISTS public.stores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Habilitar RLS en stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura: Todos los usuarios activos pueden ver las tiendas
CREATE POLICY "stores_select_all" ON public.stores FOR SELECT
USING ( auth.uid() IS NOT NULL );

-- Políticas de escritura: Solo Admins
CREATE POLICY "stores_insert_admin" ON public.stores FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.current_app_role() = 'admin' );

CREATE POLICY "stores_update_admin" ON public.stores FOR UPDATE
USING ( auth.uid() IS NOT NULL AND public.current_app_role() = 'admin' );

-- MIGRACIÓN DE DATOS EXISTENTES
-- Insertamos automáticamente todas las tiendas que ya existen en los perfiles
INSERT INTO public.stores (code, name)
SELECT DISTINCT store_code, store_name 
FROM public.profiles 
WHERE store_code IS NOT NULL
ON CONFLICT (code) DO NOTHING;

-- AÑADIR FOREIGN KEYS A TODAS LAS TABLAS OPERATIVAS
-- Esto garantiza que nadie pueda inyectar un `store_code` falso como "TODAS" o malicioso.

ALTER TABLE public.profiles 
  ADD CONSTRAINT fk_profiles_store FOREIGN KEY (store_code) REFERENCES public.stores(code) ON DELETE RESTRICT;

ALTER TABLE public.waste_records 
  ADD CONSTRAINT fk_waste_store FOREIGN KEY (store_code) REFERENCES public.stores(code) ON DELETE RESTRICT;

ALTER TABLE public.instructions 
  ADD CONSTRAINT fk_instructions_store FOREIGN KEY (store_code) REFERENCES public.stores(code) ON DELETE RESTRICT;

ALTER TABLE public.daily_basics 
  ADD CONSTRAINT fk_daily_store FOREIGN KEY (store_code) REFERENCES public.stores(code) ON DELETE RESTRICT;

ALTER TABLE public.impulse_records 
  ADD CONSTRAINT fk_impulse_store FOREIGN KEY (store_code) REFERENCES public.stores(code) ON DELETE RESTRICT;

ALTER TABLE public.fefo_records 
  ADD CONSTRAINT fk_fefo_store FOREIGN KEY (store_code) REFERENCES public.stores(code) ON DELETE RESTRICT;

ALTER TABLE public.admin_audit_logs 
  ADD CONSTRAINT fk_audit_store FOREIGN KEY (store_code) REFERENCES public.stores(code) ON DELETE RESTRICT;

-- Opcional (si existen)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_handovers') THEN
        ALTER TABLE public.shift_handovers 
          ADD CONSTRAINT fk_handovers_store FOREIGN KEY (store_code) REFERENCES public.stores(code) ON DELETE RESTRICT;
    END IF;
END $$;

-- =============================================================================
-- MINIMAX FASE 1: ÍNDICES COMPUESTOS PARA DASHBOARD
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_waste_store_created ON public.waste_records(store_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instructions_store_created ON public.instructions(store_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_store_created ON public.daily_basics(store_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_impulses_store_created ON public.impulse_records(store_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fefo_store_created ON public.fefo_records(store_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_user_status ON public.profiles(user_id, status);
