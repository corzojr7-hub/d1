import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rdilgbtvktenncmzjlis.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaWxnYnR2a3Rlbm5jbXpqbGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3ODEzNzQsImV4cCI6MjA5NjM1NzM3NH0.KH82laIhivZwdHB0YM4dsfbZMknTUBB1nFAMlAvCbKc";
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: "test_metadata@mi2.com",
    password: "password123",
    options: {
      data: {
        display_name: "Test Supervisor",
        store_name: "Test Store",
        store_code: "123",
      }
    }
  });

  if (authError) {
    console.log("Auth Error:", authError);
    return;
  }

  console.log("User Metadata:", authData.user.user_metadata);
}

test();
