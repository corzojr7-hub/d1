
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { error } = await supabase.rpc('exec_sql', { query: 'ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS monthly_budget numeric DEFAULT 0; ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS accumulated_sales numeric DEFAULT 0;' });
  console.log('rpc executed:', error);
}
run();
