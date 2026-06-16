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
