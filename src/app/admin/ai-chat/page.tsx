import { requireAdminContext } from "../admin-metrics";
import AdminAiChatClient from "./AdminAiChatClient";

export default async function AdminAiChatPage() {
  const { supabase } = await requireAdminContext();
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "supervisor")
    .eq("status", "activo")
    .neq("store_code", "ADMIN-CENTRAL");

  return <AdminAiChatClient storeCount={count || 0} />;
}
