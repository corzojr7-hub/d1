-- Fase 3: PIN seguro compatible.
-- Mantiene security_pin para usuarios existentes y agrega el hash nuevo.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS security_pin_hash text;
