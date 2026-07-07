-- =============================================================================
-- FASE 1.4: PERSISTENCIA LEGAL DE ASISTENTES (REPORTE IA EXTERNA)
-- =============================================================================

-- El reporte crítico indicó que el nombre del Asistente se perdía. 
-- Ahora que las Server Actions envían `operator_name`, necesitamos asegurarnos 
-- de que las tablas estén listas para recibir y persistir esta columna.

ALTER TABLE public.waste_records ADD COLUMN IF NOT EXISTS operator_name text;
ALTER TABLE public.instructions ADD COLUMN IF NOT EXISTS operator_name text;
ALTER TABLE public.daily_basics ADD COLUMN IF NOT EXISTS operator_name text;
ALTER TABLE public.impulse_records ADD COLUMN IF NOT EXISTS operator_name text;
ALTER TABLE public.fefo_records ADD COLUMN IF NOT EXISTS operator_name text;

-- Asegurarse de que `operator_name` también quede registrado en las auditorías de handover si aplica
ALTER TABLE public.shift_handovers ADD COLUMN IF NOT EXISTS operator_name text;

-- =============================================================================
-- LISTO: La persistencia de los asistentes queda registrada en base de datos.
-- =============================================================================
