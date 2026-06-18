import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import ClientQuadrants from "./ClientQuadrants";

export const metadata = {
  title: "Cuadrantes — SCO",
};

export default async function QuadrantsPage() {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("quadrant_assignments")
    .select("*")
    .eq("store_code", profile.store_code)
    .order("created_at", { ascending: false });

  const assistants = profile.assistants || [];

  return <ClientQuadrants assignments={assignments || []} assistants={assistants} />;
}
