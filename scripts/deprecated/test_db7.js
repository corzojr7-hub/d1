
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', 'd24e581e-a247-4a8c-b9bc-8421b2d195f0');
  console.log(JSON.stringify(data, null, 2));
  console.log('Error:', error);
}
check();
