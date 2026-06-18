import Link from "next/link";
import { requireAuth } from "@/lib/supabase/require-auth";
import NewInstructionForm from "./NewInstructionForm";

export default async function NewInstructionPage() {

  
  const { profile } = await requireAuth();

  const teamOptions = [];
  if (profile) {
    teamOptions.push({ id: 'sup', display_name: profile.supervisor_name, role: 'supervisor' });
    const addedNames = new Set<string>();
    
    if (profile.second_in_charge) {
      teamOptions.push({ id: 'seg', display_name: profile.second_in_charge, role: 'segunda encargada' });
      addedNames.add(profile.second_in_charge);
    }
    if (profile.third_in_charge) {
      teamOptions.push({ id: 'ter', display_name: profile.third_in_charge, role: 'tercero encargado' });
      addedNames.add(profile.third_in_charge);
    }
    
    if (Array.isArray(profile.assistants)) {
      profile.assistants.forEach((ast: any, idx: number) => {
        if (!addedNames.has(ast.name)) {
          teamOptions.push({ id: `ast-${idx}`, display_name: ast.name, role: 'asistente' });
          addedNames.add(ast.name);
        }
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
