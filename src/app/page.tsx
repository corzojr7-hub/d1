import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, ClipboardPlus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/supabase/require-auth";
import InstructionCard from "@/components/instructions/InstructionCard";
import WasteCard from "@/components/waste/WasteCard";
import StoreTeamSummary from "@/components/StoreTeamSummary";
import DashboardCharts from "@/components/dashboard/DashboardCharts";

export const metadata: Metadata = {
  title: "Inicio — Sistema de Control Operativo de Tienda",
};

export default async function Home() {
  const supabase = await createClient();
  const { profile } = await requireAuth();

  // Redirigir si es el administrador central
  if (profile.role === "admin") {
    redirect("/admin");
  }

  // Obtener el perfil del usuario actual para saber el store_code
  const { data: { user } } = await supabase.auth.getUser();
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("store_code, requires_password_change")
    .eq("user_id", user?.id)
    .single();

  const storeCode = currentUserProfile?.store_code;

  if (currentUserProfile?.requires_password_change) {
    redirect("/update-password");
  }

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Start of week (Monday)
  const today = new Date();
  const day = today.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(today.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfWeekIso = startOfWeek.toISOString();

  const [
    { count: pendingCount },
    { data: recentInstructions },
    { count: wasteCount },
    { count: wasteCountWeek },
    { data: allWaste },
    { data: storeProfiles }
  ] = await Promise.all([
    supabase
      .from("instructions")
      .select("*", { count: "exact", head: true })
      .in("status", ["pendiente", "en_proceso"])
      .eq("store_code", storeCode),
    supabase
      .from("instructions")
      .select("*")
      .eq("store_code", storeCode)
      .order("created_at", { ascending: false })
      .limit(3),
    adminClient
      .from("waste_records")
      .select("*", { count: "exact", head: true })
      .eq("store_code", storeCode),
    adminClient
      .from("waste_records")
      .select("*", { count: "exact", head: true })
      .eq("store_code", storeCode)
      .gte("created_at", startOfWeekIso),
    adminClient
      .from("waste_records")
      .select("*, products(name)")
      .eq("store_code", storeCode)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("user_id, display_name")
      .eq("store_code", storeCode)
  ]);

  const profileMap = new Map((storeProfiles || []).map((p) => [p.user_id, p.display_name]));

  const recentWaste = allWaste ? allWaste.slice(0, 3) : [];

  // Aggregation for Dashboard
  const productWasteMap = new Map<string, number>();
  const reasonMap = new Map<string, number>();
  const userWasteMap = new Map<string, number>();

  if (allWaste) {
    for (const record of allWaste) {
      const productName = record.products?.name ?? record.barcode_id;
      productWasteMap.set(productName, (productWasteMap.get(productName) || 0) + record.qty);
      
      const reason = record.reason;
      reasonMap.set(reason, (reasonMap.get(reason) || 0) + record.qty);
      
      const author = profileMap.get(record.created_by) || "Desconocido";
      userWasteMap.set(author, (userWasteMap.get(author) || 0) + record.qty);
    }
  }

  const topProducts = Array.from(productWasteMap.entries())
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const reasonData = Array.from(reasonMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const userWasteData = Array.from(userWasteMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="mx-auto max-w-md bg-white min-h-screen pb-24">
      <StoreTeamSummary />

      {/* Instruccion Activa Card */}
      {recentInstructions && recentInstructions.length > 0 && (
        <div className="mx-4 mt-4 mb-8 rounded-2xl border border-red-100 bg-white p-4 shadow-[0_2px_10px_rgba(229,29,46,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold tracking-widest text-[#e51d2e] uppercase">
              Instrucción Activa
            </span>
            <span className="rounded bg-[#fff8e6] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#d97706]">
              {recentInstructions[0].priority === 'alta' ? 'Alta Prioridad' : recentInstructions[0].priority === 'media' ? 'Media Prioridad' : 'Baja Prioridad'}
            </span>
          </div>
          <h3 className="mt-2 text-base font-bold leading-snug text-[#1d1b20]">
            {recentInstructions[0].content}
          </h3>
          <div className="mt-3 flex items-center gap-4 text-xs">
            <span className="text-[#64748b]">
              Resp: <span className="font-bold text-[#1d1b20]">{recentInstructions[0].responsible}</span>
            </span>
            <span className="text-[#64748b]">
              Estado: <span className="font-bold text-[#e51d2e]">{recentInstructions[0].status === 'pendiente' ? 'Pendiente' : 'En Proceso'}</span>
            </span>
          </div>
        </div>
      )}

      {/* Metricas gigantes */}
      <div className="grid grid-cols-3 px-4 pt-6 pb-2">
        <div className="flex flex-col border-r border-slate-100/60 pr-3">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
            Tareas
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold tracking-tight text-[#0a58ca] tabular-nums">
              {String(pendingCount ?? 0).padStart(2, '0')}
            </span>
          </div>
        </div>

        <div className="flex flex-col border-r border-slate-100/60 px-3">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
            Merma Sem
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold tracking-tight text-[#e51d2e] tabular-nums">
              {wasteCountWeek ?? 0}
            </span>
          </div>
        </div>

        <div className="flex flex-col pl-3">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
            Merma Total
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold tracking-tight text-[#e51d2e] tabular-nums">
              {wasteCount ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Botones CTA masivos */}
      <div className="mt-6 grid grid-cols-2 gap-4 px-5">
        <Link
          href="/instructions/new"
          className="group flex flex-col justify-between rounded-[20px] bg-[#e51d2e] p-4 transition-all duration-200 active:scale-[0.98] min-h-[140px]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/20">
            <ClipboardPlus className="h-[22px] w-[22px] text-white" strokeWidth={2} />
          </div>
          <div className="mt-4">
            <p className="text-[17px] font-bold leading-tight text-white tracking-tight">
              Nueva Instrucción
            </p>
            <p className="mt-1 text-[11px] leading-tight text-white/90 pr-2">
              Asignar orden de trabajo urgente
            </p>
          </div>
        </Link>

        <Link
          href="/waste/new"
          className="group flex flex-col justify-between rounded-[20px] bg-[#0a58ca] p-4 transition-all duration-200 active:scale-[0.98] min-h-[140px]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/20">
            <Trash2 className="h-[22px] w-[22px] text-white" strokeWidth={2} />
          </div>
          <div className="mt-4">
            <p className="text-[17px] font-bold leading-tight text-white tracking-tight">
              Registrar Merma
            </p>
            <p className="mt-1 text-[11px] leading-tight text-white/90 pr-2">
              Trazabilidad de avería o merma
            </p>
          </div>
        </Link>
      </div>

      {/* Analytics Dashboard */}
      <section className="mt-10 px-4">
        <div className="mb-4">
          <h2 className="text-[17px] font-bold text-[#1d1b20]">
            Métricas de Merma
          </h2>
          <p className="mt-0.5 text-[11px] text-[#64748b]">
            Estadísticas globales de la tienda
          </p>
        </div>
        {allWaste && allWaste.length > 0 ? (
          <DashboardCharts
            topProducts={topProducts}
            reasonData={reasonData}
            userWasteData={userWasteData}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <p className="text-xs font-medium text-slate-500">
              No hay mermas registradas todavía para generar gráficas.
            </p>
          </div>
        )}
      </section>

      {/* Herramientas Adicionales (Siempre visibles) */}
      <section className="mt-10 px-4">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-[17px] font-bold text-[#1d1b20]">
              Accesos Rápidos
            </h2>
            <p className="mt-0.5 text-[11px] text-[#64748b]">
              Herramientas de operación
            </p>
          </div>
          <Link
            href="/instructions"
            className="text-xs font-bold text-[#e51d2e] border border-[#e51d2e] py-1.5 px-3 rounded-lg text-center active:scale-95 transition-transform"
          >
            Manual Encargado
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-2">
          <Link href="/handover" className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col gap-2 items-start active:scale-95 transition-transform">
            <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Entrega de Turno</h3>
              <p className="text-[10px] text-slate-500">Foto de bodega</p>
            </div>
          </Link>
          
          <Link href="/impulses" className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col gap-2 items-start active:scale-95 transition-transform">
            <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Impulso</h3>
              <p className="text-[10px] text-slate-500">Ventas por asistente</p>
            </div>
          </Link>
        </div>
        <Link
          href="/schedule"
          className="w-full text-xs font-bold text-blue-600 border border-blue-600 py-3 px-4 rounded-xl text-center active:scale-95 transition-transform flex items-center justify-center gap-2 mt-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
          Armar Horarios IA
        </Link>
      </section>

      {/* Instrucciones del Día */}
      {recentInstructions && recentInstructions.length > 0 && (
        <section className="mt-10 px-4">
          <div className="mb-4">
            <h2 className="text-[17px] font-bold text-[#1d1b20]">
              Instrucciones Recientes
            </h2>
            <p className="mt-0.5 text-[11px] text-[#64748b]">
              Últimas tareas asignadas
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {recentInstructions.map((inst) => (
              <InstructionCard key={inst.id} instruction={inst} />
            ))}
          </div>
        </section>
      )}

      {(!recentInstructions || recentInstructions.length === 0) && (
        <div className="mx-4 mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <FileText className="mb-3 size-6 text-slate-300" />
          <p className="text-xs font-medium text-slate-500">
            No hay instrucciones recientes
          </p>
          <Link
            href="/instructions/new"
            className="mt-3 rounded-full bg-[#1d1b20] px-5 py-2 text-[11px] font-bold text-white"
          >
            Crear primera instrucción
          </Link>
        </div>
      )}

      {/* Registros de Merma Recientes */}
      {recentWaste && recentWaste.length > 0 && (
        <section className="mt-10 px-4">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-[17px] font-bold text-[#1d1b20]">
                Registros Recientes
              </h2>
              <p className="mt-0.5 text-[11px] text-[#64748b]">
                Últimas 3 mermas procesadas
              </p>
            </div>
            <Link
              href="/waste"
              className="text-xs font-bold text-[#e51d2e]"
            >
              Ver Todo &gt;
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            {recentWaste.map((rec) => (
              <WasteCard key={rec.id} record={rec} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
