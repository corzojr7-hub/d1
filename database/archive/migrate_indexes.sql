-- ---------------------------------------------------------------------------
-- Migration: Add Indexes to audits table
-- ---------------------------------------------------------------------------
create index if not exists idx_audits_audit_type on audits(audit_type);
create index if not exists idx_audits_created_at on audits(created_at);
create index if not exists idx_audits_created_by on audits(created_by);
