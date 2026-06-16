import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rdilgbtvktenncmzjlis.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaWxnYnR2a3Rlbm5jbXpqbGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3ODEzNzQsImV4cCI6MjA5NjM1NzM3NH0.KH82laIhivZwdHB0YM4dsfbZMknTUBB1nFAMlAvCbKc";
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: "test_insert_2@tiendad1.com",
    password: "password123",
  });

  if (authError) {
    console.log("Auth Error:", authError);
    return;
  }

  const userId = authData.user.id;
  console.log("User ID:", userId);

  // Intentamos insert
  const { data, error } = await supabase.from("profiles").insert({
    user_id: userId,
    role: "supervisor",
    full_name: "Test",
    display_name: "Test",
    email: "test_insert_2@tiendad1.com",
    status: "activo",
    store_name: "Test Store",
    store_code: "999",
    second_in_charge: "",
    third_in_charge: "",
    assistant_count: 0,
    assistants: [],
    areas: [],
    basic_tasks: []
  }).select();

  console.log("Insert Result:", { data, error });
}

test();
