import type { SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseAuth(supabase: SupabaseClient) {
  return {
    async login(email: string, password: string) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
      return data.user;
    },

    async logout() {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
    },

    async getSession() {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  };
}
