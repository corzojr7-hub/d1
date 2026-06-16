import { createClient } from "./supabase/server";

export async function checkRateLimit(ipOrUser: string, limit: number, windowMs: number): Promise<boolean> {
  const supabase = await createClient();
  const windowStart = new Date(Date.now() - windowMs).toISOString();

  // Eliminar registros viejos (opcional, aunque lo hace el pg_cron o un trigger idealmente)
  await supabase.rpc("cleanup_rate_limits").catch(() => {});

  // Buscar si ya existe el registro en la ventana actual
  const { data } = await supabase
    .from("rate_limits")
    .select("hits, window_start")
    .eq("ip", ipOrUser)
    .eq("action", "general")
    .gte("window_start", windowStart)
    .order("window_start", { ascending: false })
    .limit(1)
    .single();

  if (data) {
    if (data.hits >= limit) return false;
    
    // Incrementar
    await supabase
      .from("rate_limits")
      .update({ hits: data.hits + 1 })
      .eq("ip", ipOrUser)
      .eq("action", "general")
      .eq("window_start", data.window_start);
  } else {
    // Insertar nuevo
    await supabase.from("rate_limits").insert({
      ip: ipOrUser,
      action: "general",
      window_start: new Date().toISOString(),
      hits: 1
    });
  }

  return true;
}
