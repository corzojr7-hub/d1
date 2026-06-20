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

  const assistants = Array.from(
    new Set(
      [
        profile.supervisor_name || profile.display_name,
        profile.second_in_charge,
        profile.third_in_charge,
        ...(profile.assistants || []).map((assistant: { name: string }) => assistant.name),
      ]
        .map((name) => name?.trim())
        .filter(Boolean),
    ),
  ).map((name) => ({ name: name as string }));

  const areas = (profile.areas || []).map((area: string) => area.trim()).filter(Boolean);

  return (
    <ClientQuadrants
      assignments={assignments || []}
      assistants={assistants}
      areas={areas}
    />
  );
}
