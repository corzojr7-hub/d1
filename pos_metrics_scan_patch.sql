alter table public.pos_metrics
  add column if not exists scan numeric not null default 0;

update public.pos_metrics
set scan = cancellations
where scan = 0
  and cancellations > 0;

