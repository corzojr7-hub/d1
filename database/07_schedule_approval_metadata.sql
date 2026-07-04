-- ---------------------------------------------------------------------------
-- Schedule approval metadata
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.weekly_schedules
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'generated';

ALTER TABLE IF EXISTS public.weekly_schedules
  ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL;

ALTER TABLE IF EXISTS public.weekly_schedules
  ADD COLUMN IF NOT EXISTS approved_by_profile_id uuid NULL
    REFERENCES public.profiles(id);

ALTER TABLE IF EXISTS public.weekly_schedules
  ADD COLUMN IF NOT EXISTS approval_note text NULL;
