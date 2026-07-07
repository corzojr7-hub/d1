
-- =============================================================================
-- ESQUEMA CONSOLIDADO (SCHEMA + SEGURIDAD RLS ESTRICTA)
-- =============================================================================

-- =============================================================================
-- Esquema SQL definitivo - Sistema de Control Operativo de Tienda
-- MVP: Instrucciones Operativas + Registro de Merma
-- Ejecutar directamente en el editor SQL de Supabase.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Funcion: set_updated_at()
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Tabla: profiles
-- ---------------------------------------------------------------------------
create table if not exists profiles (
    id                uuid        primary key default gen_random_uuid(),
    user_id           uuid        not null unique references auth.users(id) on delete cascade,
    role              text        not null,
    full_name         text        not null,
    display_name      text        not null,
    email             text        not null,
    status            text        not null default 'activo',
    store_name        text        not null,
    store_code        text        not null,
    second_in_charge  text        not null default '',
    third_in_charge   text        not null default '',
    assistant_count   integer     not null default 0,
    assistants        jsonb       not null default '[]'::jsonb,
    areas             jsonb       not null default '[]'::jsonb,
    basic_tasks       jsonb       not null default '[]'::jsonb,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists email text;
alter table profiles add column if not exists status text not null default 'activo';
alter table profiles add column if not exists store_name text;
alter table profiles add column if not exists store_code text;
alter table profiles add column if not exists second_in_charge text not null default '';
alter table profiles add column if not exists third_in_charge text not null default '';
alter table profiles add column if not exists assistant_count integer not null default 0;
alter table profiles add column if not exists assistants jsonb not null default '[]'::jsonb;
alter table profiles add column if not exists areas jsonb not null default '[]'::jsonb;
alter table profiles add column if not exists basic_tasks jsonb not null default '[]'::jsonb;
alter table profiles add column if not exists updated_at timestamptz not null default now();

update profiles
set
    display_name = coalesce(display_name, full_name, 'Supervisor'),
    full_name = coalesce(full_name, display_name, 'Supervisor'),
    email = coalesce(email, ''),
    store_name = coalesce(store_name, 'Mi tienda'),
    store_code = coalesce(store_code, ''),
    assistants = coalesce(assistants, '[]'::jsonb);

alter table profiles alter column full_name set not null;
alter table profiles alter column display_name set not null;
alter table profiles alter column email set not null;
alter table profiles alter column store_name set not null;
alter table profiles alter column store_code set not null;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
    before update on profiles
    for each row
    execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Tabla: instructions
-- ---------------------------------------------------------------------------
create table if not exists instructions (
    id          uuid        primary key default gen_random_uuid(),
    responsible text        not null,
    content     text        not null,
    priority    text        not null,
    status      text        not null default 'pendiente',
    created_by  uuid        not null,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

drop trigger if exists trg_instructions_updated_at on instructions;
create trigger trg_instructions_updated_at
    before update on instructions
    for each row
    execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Tabla: products
-- ---------------------------------------------------------------------------
create table if not exists products (
    id          uuid        primary key default gen_random_uuid(),
    barcode_id  text        not null unique,
    material_code text,
    name        text        not null,
    category    text        not null,
    unit        text        not null,
    created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Tabla: waste_records
-- ---------------------------------------------------------------------------
create table if not exists waste_records (
    id            uuid        primary key default gen_random_uuid(),
    barcode_id    text        not null,
    product_id    uuid        references products(id) on delete set null,
    qty           numeric     not null,
    unit          text        not null,
    reason        text        not null,
    deposited_by  text        not null,
    area          text        not null,
    status        text        not null default 'pendiente',
    observation   text        not null default '',
    image_url     text,
    store_code    text        not null default '',
    idempotency_key text      unique,
    created_by    uuid        not null,
    created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indices
-- ---------------------------------------------------------------------------
create index if not exists idx_profiles_user_id           on profiles(user_id);
create index if not exists idx_instructions_status        on instructions(status);
create index if not exists idx_instructions_created_by    on instructions(created_by);
create index if not exists idx_instructions_created_at    on instructions(created_at);
create index if not exists idx_products_barcode_id        on products(barcode_id);
create index if not exists idx_waste_records_status       on waste_records(status);
create index if not exists idx_waste_records_created_by   on waste_records(created_by);
create index if not exists idx_waste_records_created_at   on waste_records(created_at);
create index if not exists idx_waste_records_barcode_id   on waste_records(barcode_id);

create index if not exists idx_audits_audit_type          on audits(audit_type);
create index if not exists idx_audits_created_at          on audits(created_at);
create index if not exists idx_audits_created_by          on audits(created_by);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table profiles      enable row level security;
alter table instructions  enable row level security;
alter table products      enable row level security;
alter table waste_records enable row level security;





















-- ---------------------------------------------------------------------------
-- Storage: Buckets públicos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('waste-evidence', 'waste-evidence', true),
       ('handover_photos', 'handover_photos', true)
on conflict (id) do nothing;

-- Tabla: audits (Checklists)
-- ---------------------------------------------------------------------------
create table if not exists audits (
    id            uuid        primary key default gen_random_uuid(),
    audit_type    text        not null,
    operator      text        not null,
    answers       jsonb       not null default '{}'::jsonb,
    image_url     text,
    created_by    uuid        not null,
    created_at    timestamptz not null default now()
);

alter table audits enable row level security;






-- ---------------------------------------------------------------------------
-- Tabla: daily_basics (Seguimiento de Básicos Diarios)
-- ---------------------------------------------------------------------------
create table if not exists daily_basics (
    id            uuid        primary key default gen_random_uuid(),
    profile_id    uuid        references profiles(id) on delete cascade,
    date          date        not null default current_date,
    task_name     text        not null,
    task_type     text        not null, -- 'apertura' | 'cierre'
    assigned_to   text        not null,
    status        text        not null default 'en_espera', -- 'en_espera', 'realizado', 'no_realizado'
    fault         text,       -- 'asistente', 'supervisor', null
    created_by    uuid        not null,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

drop trigger if exists trg_daily_basics_updated_at on daily_basics;
create trigger trg_daily_basics_updated_at
    before update on daily_basics
    for each row
    execute function set_updated_at();

create index if not exists idx_daily_basics_date on daily_basics(date);
create index if not exists idx_daily_basics_profile_id on daily_basics(profile_id);

alter table daily_basics enable row level security;





-- ---------------------------------------------------------------------------
-- Tabla: push_subscriptions (Suscripciones Web Push)
-- ---------------------------------------------------------------------------
create table if not exists push_subscriptions (
    id            uuid        primary key default gen_random_uuid(),
    user_id       uuid        not null references auth.users(id) on delete cascade,
    subscription  jsonb       not null,
    created_at    timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user_id on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;





-- ---------------------------------------------------------------------------
-- Tabla: shift_handovers (Entrega de Turno)
-- ---------------------------------------------------------------------------
create table if not exists shift_handovers (
    id              uuid        primary key default gen_random_uuid(),
    profile_id      uuid        not null references profiles(id) on delete cascade,
    handed_by       text        not null,
    received_by     text        not null,
    photo_url       text        not null,
    observations    text        not null default '',
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

drop trigger if exists trg_shift_handovers_updated_at on shift_handovers;
create trigger trg_shift_handovers_updated_at
    before update on shift_handovers
    for each row
    execute function set_updated_at();

create index if not exists idx_shift_handovers_profile_id on shift_handovers(profile_id);
create index if not exists idx_shift_handovers_created_at on shift_handovers(created_at);

alter table shift_handovers enable row level security;




-- ---------------------------------------------------------------------------
-- Tabla: impulse_records (Módulo de Impulso)
-- ---------------------------------------------------------------------------
create table if not exists impulse_records (
    id            uuid        primary key default gen_random_uuid(),
    profile_id    uuid        not null references profiles(id) on delete cascade,
    date          date        not null default current_date,
    assistant     text        not null,
    impulse_type  text        not null,
    product_name  text        not null,
    quantity      integer     not null default 0,
    created_by    uuid        not null,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

drop trigger if exists trg_impulse_records_updated_at on impulse_records;
create trigger trg_impulse_records_updated_at before update on impulse_records for each row execute function set_updated_at();

create index if not exists idx_impulse_records_profile_id on impulse_records(profile_id);
create index if not exists idx_impulse_records_date on impulse_records(date);

alter table impulse_records enable row level security;





-- ---------------------------------------------------------------------------
-- Tabla: pos_metrics (Productividad y Caja)
-- ---------------------------------------------------------------------------
create table if not exists pos_metrics (
    id            uuid        primary key default gen_random_uuid(),
    profile_id    uuid        not null references profiles(id) on delete cascade,
    date          date        not null default current_date,
    assistant     text        not null,
    cancellations integer     not null default 0,
    voids         integer     not null default 0,
    productivity  numeric     not null default 0,
    created_by    uuid        not null,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

drop trigger if exists trg_pos_metrics_updated_at on pos_metrics;
create trigger trg_pos_metrics_updated_at before update on pos_metrics for each row execute function set_updated_at();

create index if not exists idx_pos_metrics_profile_id on pos_metrics(profile_id);
create index if not exists idx_pos_metrics_date on pos_metrics(date);

alter table pos_metrics enable row level security;





-- ---------------------------------------------------------------------------
-- Tabla: weekly_schedules (Malla de Horarios IA)
-- ---------------------------------------------------------------------------
create table if not exists weekly_schedules (
    id              uuid        primary key default gen_random_uuid(),
    profile_id      uuid        not null references profiles(id) on delete cascade,
    week_start      date        not null,
    week_end        date        not null,
    schedule_data   jsonb       not null default '{}'::jsonb,
    status          text        not null default 'borrador', -- 'borrador', 'publicado'
    created_by      uuid        not null,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

drop trigger if exists trg_weekly_schedules_updated_at on weekly_schedules;
create trigger trg_weekly_schedules_updated_at before update on weekly_schedules for each row execute function set_updated_at();

create index if not exists idx_weekly_schedules_dates on weekly_schedules(profile_id, week_start, week_end);

alter table weekly_schedules enable row level security;





-- ---------------------------------------------------------------------------
-- Tabla: fefo_records (Control de Vencimientos FEFO)
-- ---------------------------------------------------------------------------
create table if not exists fefo_records (
    id            uuid        primary key default gen_random_uuid(),
    profile_id    uuid        not null references profiles(id) on delete cascade,
    barcode_id    text        not null,
    product_name  text        not null,
    quantity      integer     not null,
    expiration_date date      not null,
    status        text        not null default 'vigente', -- 'vigente', 'impulso', 'mermado'
    created_by    uuid        not null,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

drop trigger if exists trg_fefo_records_updated_at on fefo_records;
create trigger trg_fefo_records_updated_at before update on fefo_records for each row execute function set_updated_at();

create index if not exists idx_fefo_records_expiration on fefo_records(profile_id, expiration_date);

alter table fefo_records enable row level security;






-- =============================================================================
-- SEGURIDAD RLS ESTRICTA (AISLAMIENTO POR STORE_CODE)
-- =============================================================================

-- =============================================================================
-- ACTUALIZACIÓN CRÍTICA DE SEGURIDAD RLS - SISTEMA DE CONTROL OPERATIVO
-- =============================================================================

-- 1. Helper Functions (Seguridad y Aislamiento por Tienda)
-- =============================================================================

-- Retorna el store_code de la tienda del usuario autenticado
CREATE OR REPLACE FUNCTION public.current_store_code()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT p.store_code
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
    AND p.status = 'activo'
  LIMIT 1;
$$;

-- Retorna el id del perfil activo del usuario autenticado
CREATE OR REPLACE FUNCTION public.current_app_profile_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT p.id
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.status = 'activo'
    LIMIT 1;
$$;

-- Retorna el rol del usuario autenticado
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT p.role
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.status = 'activo'
    LIMIT 1;
$$;

-- Retorna true si el usuario tiene un perfil activo
CREATE OR REPLACE FUNCTION public.is_active_app_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT exists (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.status = 'activo'
    );
$$;

-- 2. Limpieza de Políticas Inseguras (Drop)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Limpieza Inicial de Políticas Inseguras (Drop)
-- ---------------------------------------------------------------------------
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND (policyname LIKE 'Allow authenticated%' OR policyname LIKE 'profiles_%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;



-- 3. Nuevas Políticas Restrictivas (Aislamiento por Tienda)
-- =============================================================================

-- PROFILES (Solo ver perfiles de tu misma tienda)
CREATE POLICY "profiles_select_own_store" ON public.profiles FOR SELECT
USING ( auth.uid() IS NOT NULL AND store_code = public.current_store_code() );

CREATE POLICY "profiles_insert_own_store" ON public.profiles FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND store_code = public.current_store_code() );

CREATE POLICY "profiles_update_own_store" ON public.profiles FOR UPDATE
USING ( auth.uid() IS NOT NULL AND store_code = public.current_store_code() );

CREATE POLICY "profiles_delete_restrict" ON public.profiles AS RESTRICTIVE FOR DELETE USING (false);

-- INSTRUCTIONS
CREATE POLICY "instructions_select_own_store" ON public.instructions FOR SELECT
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND created_by IN (SELECT id FROM public.profiles WHERE store_code = public.current_store_code()) );

CREATE POLICY "instructions_insert_own_store" ON public.instructions FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND created_by = public.current_app_profile_id() );

CREATE POLICY "instructions_update_own_store" ON public.instructions FOR UPDATE
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND created_by IN (SELECT id FROM public.profiles WHERE store_code = public.current_store_code()) );

CREATE POLICY "instructions_delete_restrict" ON public.instructions AS RESTRICTIVE FOR DELETE USING (false);

-- WASTE RECORDS (Añadir store_code a la tabla si no existe, por ahora asumimos filtrado via created_by profile)
ALTER TABLE public.waste_records ADD COLUMN IF NOT EXISTS store_code text;
-- Actualizar histórico para que coincida con el store_code de quien lo creó
UPDATE public.waste_records w SET store_code = (SELECT store_code FROM public.profiles p WHERE p.id = w.created_by) WHERE store_code IS NULL;

CREATE POLICY "waste_records_select_own_store" ON public.waste_records FOR SELECT
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "waste_records_insert_own_store" ON public.waste_records FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "waste_records_update_own_store" ON public.waste_records FOR UPDATE
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "waste_records_delete_restrict" ON public.waste_records AS RESTRICTIVE FOR DELETE USING (false);


-- AUDITS (Checklists)
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS store_code text;
UPDATE public.audits a SET store_code = (SELECT store_code FROM public.profiles p WHERE p.id = a.created_by) WHERE store_code IS NULL;

CREATE POLICY "audits_select_own_store" ON public.audits FOR SELECT
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "audits_insert_own_store" ON public.audits FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "audits_update_own_store" ON public.audits FOR UPDATE
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "audits_delete_restrict" ON public.audits AS RESTRICTIVE FOR DELETE USING (false);


-- PRODUCTS (Catálogo)
-- Los productos son globales, todos los usuarios activos pueden verlos
CREATE POLICY "products_select_global" ON public.products FOR SELECT
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() );

CREATE POLICY "products_insert_global" ON public.products FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.is_active_app_user() );

CREATE POLICY "products_update_global" ON public.products FOR UPDATE
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() );


-- SHIFT HANDOVERS
CREATE POLICY "handovers_select_own_store" ON public.shift_handovers FOR SELECT
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND profile_id IN (SELECT id FROM public.profiles WHERE store_code = public.current_store_code()) );

CREATE POLICY "handovers_insert_own_store" ON public.shift_handovers FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND profile_id = public.current_app_profile_id() );

CREATE POLICY "handovers_update_own_store" ON public.shift_handovers FOR UPDATE
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND profile_id IN (SELECT id FROM public.profiles WHERE store_code = public.current_store_code()) );

CREATE POLICY "handovers_delete_restrict" ON public.shift_handovers AS RESTRICTIVE FOR DELETE USING (false);


-- IMPULSE RECORDS
ALTER TABLE public.impulse_records ADD COLUMN IF NOT EXISTS store_code text;
UPDATE public.impulse_records i SET store_code = (SELECT store_code FROM public.profiles p WHERE p.id = i.created_by) WHERE store_code IS NULL;

CREATE POLICY "impulse_select_own_store" ON public.impulse_records FOR SELECT
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "impulse_insert_own_store" ON public.impulse_records FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "impulse_update_own_store" ON public.impulse_records FOR UPDATE
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );


-- FEFO RECORDS
ALTER TABLE public.fefo_records ADD COLUMN IF NOT EXISTS store_code text;
UPDATE public.fefo_records f SET store_code = (SELECT store_code FROM public.profiles p WHERE p.id = f.created_by) WHERE store_code IS NULL;

CREATE POLICY "fefo_select_own_store" ON public.fefo_records FOR SELECT
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "fefo_insert_own_store" ON public.fefo_records FOR INSERT
WITH CHECK ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );

CREATE POLICY "fefo_update_own_store" ON public.fefo_records FOR UPDATE
USING ( auth.uid() IS NOT NULL AND public.is_active_app_user() AND store_code = public.current_store_code() );


-- 4. Storage Buckets (Privacidad)
-- =============================================================================
UPDATE storage.buckets SET public = false WHERE id IN ('waste-evidence', 'handover_photos');

-- Limpiar politicas de storage inseguras
-- (Limpieza de policies antigua removida del script consolidado)

-- Nuevas políticas de Storage
CREATE POLICY "waste_evidence_select_store" ON storage.objects FOR SELECT
USING ( bucket_id = 'waste-evidence' AND auth.uid() IS NOT NULL AND public.is_active_app_user() AND (storage.foldername(name))[1] = public.current_store_code() );

CREATE POLICY "waste_evidence_insert_store" ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'waste-evidence' AND auth.uid() IS NOT NULL AND public.is_active_app_user() AND (storage.foldername(name))[1] = public.current_store_code() );

CREATE POLICY "handover_photos_select_store" ON storage.objects FOR SELECT
USING ( bucket_id = 'handover_photos' AND auth.uid() IS NOT NULL AND public.is_active_app_user() AND (storage.foldername(name))[1] = public.current_store_code() );

CREATE POLICY "handover_photos_insert_store" ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'handover_photos' AND auth.uid() IS NOT NULL AND public.is_active_app_user() AND (storage.foldername(name))[1] = public.current_store_code() );


-- =============================================================================
-- TABLAS ADICIONALES Y TRIGGERS DE SEGURIDAD (enforce_store_code)
-- =============================================================================

-- Modificar tablas para asegurar que tengan store_code
ALTER TABLE audits ADD COLUMN IF NOT EXISTS store_code text NOT NULL DEFAULT '';
ALTER TABLE daily_basics ADD COLUMN IF NOT EXISTS store_code text NOT NULL DEFAULT '';
ALTER TABLE impulse_records ADD COLUMN IF NOT EXISTS store_code text NOT NULL DEFAULT '';
ALTER TABLE pos_metrics ADD COLUMN IF NOT EXISTS store_code text NOT NULL DEFAULT '';
ALTER TABLE fefo_records ADD COLUMN IF NOT EXISTS store_code text NOT NULL DEFAULT '';
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS store_code text NOT NULL DEFAULT '';

-- Función para forzar store_code antes de insertar/actualizar
CREATE OR REPLACE FUNCTION public.enforce_store_code()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  NEW.store_code := public.current_store_code();
  IF NEW.store_code IS NULL OR NEW.store_code = '' THEN
    RAISE EXCEPTION 'Usuario sin tienda activa o no autorizado';
  END IF;
  RETURN NEW;
END;
$$;

-- Crear triggers para las tablas operativas
DROP TRIGGER IF EXISTS trg_enforce_store_code_waste ON waste_records;
CREATE TRIGGER trg_enforce_store_code_waste BEFORE INSERT OR UPDATE ON waste_records FOR EACH ROW EXECUTE FUNCTION public.enforce_store_code();

DROP TRIGGER IF EXISTS trg_enforce_store_code_audits ON audits;
CREATE TRIGGER trg_enforce_store_code_audits BEFORE INSERT OR UPDATE ON audits FOR EACH ROW EXECUTE FUNCTION public.enforce_store_code();

DROP TRIGGER IF EXISTS trg_enforce_store_code_fefo ON fefo_records;
CREATE TRIGGER trg_enforce_store_code_fefo BEFORE INSERT OR UPDATE ON fefo_records FOR EACH ROW EXECUTE FUNCTION public.enforce_store_code();

DROP TRIGGER IF EXISTS trg_enforce_store_code_daily ON daily_basics;
CREATE TRIGGER trg_enforce_store_code_daily BEFORE INSERT OR UPDATE ON daily_basics FOR EACH ROW EXECUTE FUNCTION public.enforce_store_code();

DROP TRIGGER IF EXISTS trg_enforce_store_code_pos ON pos_metrics;
CREATE TRIGGER trg_enforce_store_code_pos BEFORE INSERT OR UPDATE ON pos_metrics FOR EACH ROW EXECUTE FUNCTION public.enforce_store_code();

DROP TRIGGER IF EXISTS trg_enforce_store_code_impulse ON impulse_records;
CREATE TRIGGER trg_enforce_store_code_impulse BEFORE INSERT OR UPDATE ON impulse_records FOR EACH ROW EXECUTE FUNCTION public.enforce_store_code();

DROP TRIGGER IF EXISTS trg_enforce_store_code_instructions ON instructions;
-- Instructions created_by acts as isolation but adding store_code is safer:
ALTER TABLE instructions ADD COLUMN IF NOT EXISTS store_code text NOT NULL DEFAULT '';
CREATE TRIGGER trg_enforce_store_code_instructions BEFORE INSERT OR UPDATE ON instructions FOR EACH ROW EXECUTE FUNCTION public.enforce_store_code();


-- =============================================================================
-- POLÍTICAS RLS FALTANTES
-- =============================================================================

-- DAILY BASICS
CREATE POLICY "daily_basics_select_store" ON public.daily_basics FOR SELECT USING (store_code = public.current_store_code());
CREATE POLICY "daily_basics_insert_store" ON public.daily_basics FOR INSERT WITH CHECK (store_code = public.current_store_code());
CREATE POLICY "daily_basics_update_store" ON public.daily_basics FOR UPDATE USING (store_code = public.current_store_code());
CREATE POLICY "daily_basics_delete_restrict" ON public.daily_basics AS RESTRICTIVE FOR DELETE USING (false);

-- POS METRICS
CREATE POLICY "pos_metrics_select_store" ON public.pos_metrics FOR SELECT USING (store_code = public.current_store_code());
CREATE POLICY "pos_metrics_insert_store" ON public.pos_metrics FOR INSERT WITH CHECK (store_code = public.current_store_code());
CREATE POLICY "pos_metrics_update_store" ON public.pos_metrics FOR UPDATE USING (store_code = public.current_store_code());
CREATE POLICY "pos_metrics_delete_restrict" ON public.pos_metrics AS RESTRICTIVE FOR DELETE USING (false);

-- PUSH SUBSCRIPTIONS (Solo el usuario dueño las lee/modifica)
CREATE POLICY "push_subs_select_own" ON public.push_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "push_subs_insert_own" ON public.push_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_subs_update_own" ON public.push_subscriptions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "push_subs_delete_own" ON public.push_subscriptions FOR DELETE USING (user_id = auth.uid());

-- TABLA PRODUCTS (Bloqueada)
DROP POLICY IF EXISTS "products_insert_global" ON public.products;
DROP POLICY IF EXISTS "products_update_global" ON public.products;
DROP POLICY IF EXISTS "products_delete_global" ON public.products;
-- Permanece products_select_global en el rls_policies.sql, los insert/update/delete no tienen policy pública, por ende están denegados.

