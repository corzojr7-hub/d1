-- INSTRUCCIONES PARA CREAR EL PRIMER JEFE DE ZONA (ADMIN)
-- 1. Ve al panel de control de Supabase (https://supabase.com/dashboard)
-- 2. Entra a tu proyecto
-- 3. Ve a la seccin 'SQL Editor' en el men izquierdo
-- 4. Abre un nuevo 'Query' y pega TODO este cdigo
-- 5. Cambia el correo 'jefedezona@mi2.com' y la contrasea '2Segura2026!' por los que t quieras.
-- 6. Dale al botn 'Run' (Ejecutar)

-- A. Configura las variables (cambia solo lo que est entre comillas simples)
DO $$
DECLARE
  nuevo_email text := 'jefedezona@mi2.com';
  nueva_password text := '2Segura2026!';
  nombre_jefe text := 'Jefe de Zona Principal';
  
  -- Variables internas
  nuevo_user_id uuid := gen_random_uuid();
BEGIN
  -- Encriptar la contrasea usando el helper de pgcrypto que usa Supabase internamente
  -- NOTA: Supabase usa un salt especfico, por lo que insertar directamente en auth.users requiere ciertos campos.
  
  -- B. Insertar en la tabla de autenticacin de Supabase
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    nuevo_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    nuevo_email,
    crypt(nueva_password, gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    json_build_object('display_name', nombre_jefe, 'role', 'admin', 'store_code', 'ADMIN-CENTRAL'),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- C. Insertar en tu tabla de perfiles (public.profiles)
  INSERT INTO public.profiles (
    user_id,
    role,
    display_name,
    full_name,
    email,
    store_code,
    store_name,
    status,
    requires_password_change
  ) VALUES (
    nuevo_user_id,
    'admin',
    nombre_jefe,
    nombre_jefe,
    nuevo_email,
    'ADMIN-CENTRAL',
    'Backoffice Central',
    'activo',
    false
  );

END $$;
