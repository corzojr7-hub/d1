-- =============================================================================
-- FASE 1.2: BLOQUEO DEFINITIVO DE BASE DE DATOS Y RLS
-- =============================================================================

-- 1. CORRECCION DE ESCALAMIENTO DE ENCARGADAS
-- Evitar que un perfil pueda modificarse su propio rol u otros roles si no es admin

DROP POLICY IF EXISTS "profiles_update_own_store" ON public.profiles;

-- Nueva politica: Pueden actualizar su tienda, pero las columnas criticas las protegera un trigger
CREATE POLICY "profiles_update_own_store" ON public.profiles FOR UPDATE
USING ( auth.uid() IS NOT NULL AND store_code = public.current_store_code() );

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Si el rol cambio y quien lo cambia NO es admin
  IF public.current_app_role() != 'admin' AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Solo un administrador puede modificar el rol de un perfil.';
  END IF;
  
  -- Prevenir que se cambien de tienda a sí mismos si no son admin
  IF public.current_app_role() != 'admin' AND NEW.store_code IS DISTINCT FROM OLD.store_code THEN
    RAISE EXCEPTION 'Solo un administrador puede transferir usuarios entre tiendas.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_escalation();

-- 2. TABLA DE AUDITORIA ADMINISTRATIVA
-- Registrar acciones destructivas y de administracion (creacion de usuarios, anulaciones)

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    store_code text NOT NULL,
    action_type text NOT NULL, -- ej: 'CREATE_USER', 'DELETE_USER', 'VOID_TASK', 'CHANGE_ROLE'
    target_id text, -- ID del usuario afectado, o tarea afectada
    details jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- RLS para admin_audit_logs: Completamente inmutable desde el cliente,
-- solo el service_role (Rutas API) podra hacer INSERT, y los admins podran leer de su tienda.
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_logs_select_admin" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "admin_audit_logs_insert_restrict" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "admin_audit_logs_update_restrict" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "admin_audit_logs_delete_restrict" ON public.admin_audit_logs;

CREATE POLICY "admin_audit_logs_select_admin" ON public.admin_audit_logs FOR SELECT
USING ( auth.uid() IS NOT NULL AND public.current_app_role() = 'admin' AND store_code = public.current_store_code() );

CREATE POLICY "admin_audit_logs_insert_restrict" ON public.admin_audit_logs FOR INSERT
WITH CHECK ( false ); -- Solo Server/Service_Role bypass RLS

CREATE POLICY "admin_audit_logs_update_restrict" ON public.admin_audit_logs FOR UPDATE
USING ( false );

CREATE POLICY "admin_audit_logs_delete_restrict" ON public.admin_audit_logs FOR DELETE
USING ( false );
