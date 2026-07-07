
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const { data: { user }, error: authErr } = await supabase.auth.admin.createUser({
    email: 'test_dairo@mi2.com',
    password: 'password123',
    email_confirm: true
  }).catch(() => ({}));
  
  // Actually, I can't sign in as Dairo if I don't know the password.
  // I will create a mock auth token for Dairo using his user_id!
  // Wait, I can just use supabase.auth.admin.generateLink or similar?
  // No, I can just sign in as him if I change his password, but I shouldn't do that.
  console.log('Skipping...');
}
check();
