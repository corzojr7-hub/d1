-- PARCHE DE SEGURIDAD RLS: PREVENIR ESCALAMIENTO LATERAL
-- Este script elimina la política vieja que permitía a un usuario actualizar todo su perfil,
-- y la reemplaza por una estricta que SOLO permite actualizar el display_name.

BEGIN;

-- 1. Eliminar la política anterior (la que permitía escalamiento lateral)
DROP POLICY IF EXISTS "profiles_update_own_store" ON public.profiles;
DROP POLICY IF EXISTS "Actualizar perfiles propia tienda" ON public.profiles;

-- 2. Crear la nueva política restrictiva
-- Los usuarios SOLO pueden actualizar su propio display_name.
-- Los cambios de rol (role), tienda (store_code) y estado (status) SOLO pueden
-- ser realizados mediante el service-role (Server Actions) o un Admin genuino en Supabase.
CREATE POLICY "profiles_update_own_display_name_only"
  ON public.profiles
  FOR UPDATE
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );

-- 3. Trigger opcional para evitar actualización de columnas sensibles directamente desde el cliente
-- (Esto garantiza que incluso si la policy de arriba falla, a nivel de tabla se bloquea)
CREATE OR REPLACE FUNCTION public.protect_profile_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el que llama NO es el super-usuario (service_role)...
  IF current_setting('role') = 'authenticated' THEN
    -- Forzar a que los campos críticos no cambien
    NEW.role = OLD.role;
    NEW.store_code = OLD.store_code;
    NEW.status = OLD.status;
    NEW.user_id = OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_escalation ON public.profiles;
CREATE TRIGGER trg_protect_profile_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_escalation();

COMMIT;
