import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rdilgbtvktenncmzjlis.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaWxnYnR2a3Rlbm5jbXpqbGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3ODEzNzQsImV4cCI6MjA5NjM1NzM3NH0.KH82laIhivZwdHB0YM4dsfbZMknTUBB1nFAMlAvCbKc";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFlow() {
  const email = `test_flow_${Date.now()}@mi2.com`;
  const password = "password123";

  // 1. signUp
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: "Flow Supervisor",
        store_name: "Flow Store",
        store_code: "Flow123",
      }
    }
  });

  if (signUpError) {
    console.error("SignUp Error:", signUpError);
    return;
  }

  console.log("SignUp User:", signUpData.user.id);
  console.log("SignUp Metadata:", signUpData.user.user_metadata);

  // 2. signInWithPassword (mimic registerUser)
  const supabaseAuth = createClient(supabaseUrl, supabaseKey);
  const { error: signInError } = await supabaseAuth.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    console.error("SignIn Error:", signInError);
    return;
  }
  console.log("SignIn Success");

  // 3. insert
  const { error: profileError } = await supabaseAuth.from("profiles").insert({
    user_id: signUpData.user.id,
    role: "supervisor",
    full_name: "Flow Supervisor",
    display_name: "Flow Supervisor",
    email: email,
    status: "activo",
    store_name: "Flow Store",
    store_code: "Flow123",
    second_in_charge: "",
    third_in_charge: "",
    assistant_count: 0,
    assistants: [],
    areas: [],
    basic_tasks: []
  });

  if (profileError) {
    console.error("Profile Insert Error:", profileError);
    return;
  }
  console.log("Profile Insert Success");

  // 4. TeamPage select
  const { data: profileData, error: selectError } = await supabaseAuth.from("profiles").select("*").eq("user_id", signUpData.user.id).single();
  
  if (selectError) {
    console.error("Profile Select Error:", selectError);
    return;
  }

  console.log("Profile Data:", profileData);
}

testFlow();
