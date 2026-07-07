
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'corzojr@mi2.com',
    password: 'password123'
  });
  if (authErr) { console.log('Auth Err:', authErr); return; }
  
  const { data, error } = await supabase.from('waste_records').select('*').limit(5);
  console.log(JSON.stringify(data, null, 2));
}
check();
