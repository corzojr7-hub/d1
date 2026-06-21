import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import ClientLogbook from "./ClientLogbook";
import { TRUCK_REPORT_PREFIX } from "@/lib/truck-report";

export const metadata = {
  title: "Bitácora Diaria — SCO",
};

export default async function LogbookPage() {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  // Get today's entries only
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: entries } = await supabase
    .from("daily_logbook")
    .select("*")
    .eq("store_code", profile.store_code)
    .gte("created_at", startOfDay.toISOString())
    .order("created_at", { ascending: false });

  const visibleEntries = (entries || []).filter(
    (entry) => !entry.content.startsWith(TRUCK_REPORT_PREFIX),
  );

  return <ClientLogbook entries={visibleEntries} />;
}
