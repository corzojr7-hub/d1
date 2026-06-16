import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NewInstructionForm from "./NewInstructionForm";

export default async function NewInstructionPage() {
  const supabase = await createClient();
  
  // Obtener los perfiles del equipo (Supervisor, encargados y asistentes)
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, second_in_charge, third_in_charge, assistants")
    .eq("user_id", user?.id)
    .single();

  const teamOptions = [];
  if (profile) {
    teamOptions.push({ id: 'sup', display_name: profile.display_name, role: profile.role });
    if (profile.second_in_charge) teamOptions.push({ id: 'seg', display_name: profile.second_in_charge, role: 'segunda encargada' });
    if (profile.third_in_charge) teamOptions.push({ id: 'ter', display_name: profile.third_in_charge, role: 'tercero encargado' });
    
    if (Array.isArray(profile.assistants)) {
      profile.assistants.forEach((ast: any, idx: number) => {
        teamOptions.push({ id: `ast-${idx}`, display_name: ast.name, role: 'asistente' });
      });
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Link
        href="/instructions"
        className="text-xs text-zinc-400 underline-offset-2 hover:underline"
      >
        Volver a instrucciones
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold text-slate-800">
        Crear Nueva Instrucción
      </h1>

      <NewInstructionForm profiles={teamOptions as any} />
    </div>
  );
}
