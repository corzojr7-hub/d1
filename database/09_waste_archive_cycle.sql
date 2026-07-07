alter table public.waste_records
  add column if not exists is_archived boolean not null default false;

update public.waste_records
set is_archived = false
where is_archived is distinct from false;

create index if not exists waste_records_store_archived_created_at_idx
  on public.waste_records (store_code, is_archived, created_at desc);
