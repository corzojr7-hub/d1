
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from('waste_records').select('*');
  console.log('Total records admin:', data?.length);

  // Let's create a temporary function to get pg_policy
  const { error: rpcErr } = await supabase.rpc('exec_sql', { query: 'SELECT * FROM pg_policy WHERE polrelid = (SELECT oid FROM pg_class WHERE relname = ''waste_records'')' });
  console.log('rpc error:', rpcErr);
}
check();
