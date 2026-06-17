
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { error } = await supabase.from('waste_records').update({ created_by: 'd24e581e-a247-4a8c-b9bc-8421b2d195f0' }).eq('id', '24d393bc-0260-49a5-9150-e82519ab1069');
  console.log('Error:', error);
}
check();
