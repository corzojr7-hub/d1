-- Fix legacy JDZ/admin visibility under RLS.
-- Admin users must read cross-store data from authenticated clients.

BEGIN;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles',
    'daily_sales',
    'sales_budgets',
    'weekly_waste',
    'waste_records',
    'instructions',
    'audits',
    'daily_basics',
    'impulse_records',
    'fefo_records',
    'pos_metrics',
    'shift_handovers',
    'weekly_schedules',
    'admin_audit_logs'
  ]
  LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        table_name || '_admin_global_select',
        table_name
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.current_app_role() = ''admin'')',
        table_name || '_admin_global_select',
        table_name
      );
    END IF;
  END LOOP;
END $$;

COMMIT;
