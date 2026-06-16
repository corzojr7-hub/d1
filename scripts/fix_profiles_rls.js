const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

const sql = `
  -- Borramos la politica vieja
  DROP POLICY IF EXISTS "profiles_update_own_store" ON public.profiles;
  
  -- Creamos la nueva politica base
  CREATE POLICY "profiles_update_own_store" ON public.profiles FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND store_code = public.current_store_code()
  );
  
  -- Trigger para evitar la escalacion de roles
  CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
  RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  AS $$
  BEGIN
    -- Si el rol cambio y quien lo cambia NO es admin, rechazamos
    IF public.current_app_role() != 'admin' AND NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'No tienes permisos para modificar el rol de un perfil.';
    END IF;
    RETURN NEW;
  END;
  $$;

  DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
  CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();
`;

supabase.rpc('inline_code_block', { sql }).then(res => { console.log(res); process.exit(0); }).catch(err => { console.error(err); process.exit(1); });
