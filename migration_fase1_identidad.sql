-- MIGRACIÓN FASE 1.1 y 1.2: IDENTIDAD CONFIABLE DE ASISTENTES

-- 1. Crear tabla para los PINs de los asistentes (Operadores)
CREATE TABLE IF NOT EXISTS public.operator_pins (
    store_code text NOT NULL,
    operator_name text NOT NULL,
    pin_hash text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (store_code, operator_name)
);

-- Habilitar RLS en operator_pins
ALTER TABLE public.operator_pins ENABLE ROW LEVEL SECURITY;

-- Solo los perfiles de la misma tienda pueden leer los pins (necesario para login)
CREATE POLICY "pins_select_own_store" ON public.operator_pins FOR SELECT
USING (store_code = public.current_store_code());

-- Solo el supervisor de la tienda puede crear/actualizar los pins
-- (Implementado via RLS usando current_store_code() y verificando el rol en el JWT, 
-- pero para mayor seguridad lo controlaremos desde el Server Action con service_role o requireSupervisor).
CREATE POLICY "pins_all_supervisor" ON public.operator_pins FOR ALL
USING (
  store_code = public.current_store_code() AND 
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'supervisor'
)
WITH CHECK (
  store_code = public.current_store_code() AND 
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'supervisor'
);

-- 2. Añadir columna operator_name a todas las tablas de eventos operativos
DO $$
BEGIN
  -- Waste Records
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waste_records' AND column_name = 'operator_name') THEN
    ALTER TABLE public.waste_records ADD COLUMN operator_name text;
  END IF;

  -- Instructions (Tareas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instructions' AND column_name = 'operator_name') THEN
    ALTER TABLE public.instructions ADD COLUMN operator_name text;
  END IF;

  -- Audits (Checklists)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audits' AND column_name = 'operator_name') THEN
    ALTER TABLE public.audits ADD COLUMN operator_name text;
  END IF;

  -- Impulse Records (Cajas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'impulse_records' AND column_name = 'operator_name') THEN
    ALTER TABLE public.impulse_records ADD COLUMN operator_name text;
  END IF;

  -- Daily Basics
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_basics' AND column_name = 'operator_name') THEN
    ALTER TABLE public.daily_basics ADD COLUMN operator_name text;
  END IF;
END $$;
