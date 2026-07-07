const URL = "https://rdilgbtvktenncmzjlis.supabase.co/rest/v1/profiles?select=*";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaWxnYnR2a3Rlbm5jbXpqbGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3ODEzNzQsImV4cCI6MjA5NjM1NzM3NH0.KH82laIhivZwdHB0YM4dsfbZMknTUBB1nFAMlAvCbKc";

fetch(URL, {
  headers: {
    "apikey": ANON_KEY,
    "Authorization": "Bearer " + ANON_KEY,
    "Accept": "application/json"
  }
}).then(res => res.json()).then(data => console.dir(data, {depth: null}));
