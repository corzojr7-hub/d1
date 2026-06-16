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

create policy "Allow authenticated select"  on profiles      for select using (auth.role() = 'authenticated');
create policy "Allow authenticated insert"  on profiles      for insert with check (auth.role() = 'authenticated');
create policy "Allow authenticated update"  on profiles      for update using (auth.role() = 'authenticated');
create policy "Allow authenticated delete"  on profiles      for delete using (auth.role() = 'authenticated');

create policy "Allow authenticated select"  on instructions  for select using (auth.role() = 'authenticated');
create policy "Allow authenticated insert"  on instructions  for insert with check (auth.role() = 'authenticated');
create policy "Allow authenticated update"  on instructions  for update using (auth.role() = 'authenticated');
create policy "Allow authenticated delete"  on instructions  for delete using (auth.role() = 'authenticated');

create policy "Allow authenticated select"  on products      for select using (auth.role() = 'authenticated');
create policy "Allow authenticated insert"  on products      for insert with check (auth.role() = 'authenticated');
create policy "Allow authenticated update"  on products      for update using (auth.role() = 'authenticated');
create policy "Allow authenticated delete"  on products      for delete using (auth.role() = 'authenticated');

create policy "Allow authenticated select"  on waste_records for select using (auth.role() = 'authenticated');
create policy "Allow authenticated insert"  on waste_records for insert with check (auth.role() = 'authenticated');
create policy "Allow authenticated update"  on waste_records for update using (auth.role() = 'authenticated');
create policy "Allow authenticated delete"  on waste_records for delete using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Storage: Buckets públicos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('waste-evidence', 'waste-evidence', true),
       ('handover_photos', 'handover_photos', true)
on conflict (id) do nothing;

create policy "Allow authenticated select waste" on storage.objects
    for select using (bucket_id = 'waste-evidence' and auth.role() = 'authenticated');

create policy "Allow authenticated insert waste" on storage.objects
    for insert with check (bucket_id = 'waste-evidence' and auth.role() = 'authenticated');

create policy "Allow authenticated update waste" on storage.objects
    for update using (bucket_id = 'waste-evidence' and auth.role() = 'authenticated');

create policy "Allow authenticated delete waste" on storage.objects
    for delete using (bucket_id = 'waste-evidence' and auth.role() = 'authenticated');

create policy "Allow public read handover photos"
    on storage.objects for select
    using ( bucket_id = 'handover_photos' );

create policy "Allow authenticated upload handover photos"
    on storage.objects for insert
    with check (
        bucket_id = 'handover_photos' 
        and auth.role() = 'authenticated'
    );

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

create policy "Allow authenticated select"  on audits for select using (auth.role() = 'authenticated');
create policy "Allow authenticated insert"  on audits for insert with check (auth.role() = 'authenticated');
create policy "Allow authenticated update"  on audits for update using (auth.role() = 'authenticated');
create policy "Allow authenticated delete"  on audits for delete using (auth.role() = 'authenticated');

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
create policy "Allow authenticated select"  on daily_basics for select using (auth.role() = 'authenticated');
create policy "Allow authenticated insert"  on daily_basics for insert with check (auth.role() = 'authenticated');
create policy "Allow authenticated update"  on daily_basics for update using (auth.role() = 'authenticated');
create policy "Allow authenticated delete"  on daily_basics for delete using (auth.role() = 'authenticated');

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
create policy "Allow authenticated select"  on push_subscriptions for select using (auth.role() = 'authenticated');
create policy "Allow authenticated insert"  on push_subscriptions for insert with check (auth.role() = 'authenticated');
create policy "Allow authenticated update"  on push_subscriptions for update using (auth.role() = 'authenticated');
create policy "Allow authenticated delete"  on push_subscriptions for delete using (auth.role() = 'authenticated');

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
create policy "Allow authenticated select"  on shift_handovers for select using (auth.role() = 'authenticated');
create policy "Allow authenticated insert"  on shift_handovers for insert with check (auth.role() = 'authenticated');
create policy "Allow authenticated update"  on shift_handovers for update using (auth.role() = 'authenticated');

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
create policy "Allow authenticated select"  on impulse_records for select using (auth.role() = 'authenticated');
create policy "Allow authenticated insert"  on impulse_records for insert with check (auth.role() = 'authenticated');
create policy "Allow authenticated update"  on impulse_records for update using (auth.role() = 'authenticated');
create policy "Allow authenticated delete"  on impulse_records for delete using (auth.role() = 'authenticated');

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
create policy "Allow authenticated select"  on pos_metrics for select using (auth.role() = 'authenticated');
create policy "Allow authenticated insert"  on pos_metrics for insert with check (auth.role() = 'authenticated');
create policy "Allow authenticated update"  on pos_metrics for update using (auth.role() = 'authenticated');
create policy "Allow authenticated delete"  on pos_metrics for delete using (auth.role() = 'authenticated');

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
create policy "Allow authenticated select"  on weekly_schedules for select using (auth.role() = 'authenticated');
create policy "Allow authenticated insert"  on weekly_schedules for insert with check (auth.role() = 'authenticated');
create policy "Allow authenticated update"  on weekly_schedules for update using (auth.role() = 'authenticated');
create policy "Allow authenticated delete"  on weekly_schedules for delete using (auth.role() = 'authenticated');

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
create policy "Allow authenticated select"  on fefo_records for select using (auth.role() = 'authenticated');
create policy "Allow authenticated insert"  on fefo_records for insert with check (auth.role() = 'authenticated');
create policy "Allow authenticated update"  on fefo_records for update using (auth.role() = 'authenticated');
create policy "Allow authenticated delete"  on fefo_records for delete using (auth.role() = 'authenticated');
