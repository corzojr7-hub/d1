import Link from "next/link";
import { requireAuth } from "@/lib/supabase/require-auth";
import NewInstructionForm from "./NewInstructionForm";

type TeamOption = {
  id: string;
  display_name: string;
  role: string;
};

type AssistantLike = {
  name: string;
};

export default async function NewInstructionPage() {
  const { profile } = await requireAuth();

  const teamOptions: TeamOption[] = [];
  if (profile) {
    teamOptions.push({
      id: "sup",
      display_name: profile.supervisor_name,
      role: "supervisor",
    });
    const addedNames = new Set<string>();

    if (profile.second_in_charge) {
      teamOptions.push({
        id: "seg",
        display_name: profile.second_in_charge,
        role: "segunda encargada",
      });
      addedNames.add(profile.second_in_charge);
    }
    if (profile.third_in_charge) {
      teamOptions.push({
        id: "ter",
        display_name: profile.third_in_charge,
        role: "tercero encargado",
      });
      addedNames.add(profile.third_in_charge);
    }

    if (Array.isArray(profile.assistants)) {
      profile.assistants.forEach((ast: AssistantLike, idx: number) => {
        if (!addedNames.has(ast.name)) {
          teamOptions.push({
            id: `ast-${idx}`,
            display_name: ast.name,
            role: "asistente",
          });
          addedNames.add(ast.name);
        }
      });
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full bg-slate-50 px-4 pb-28 pt-8 sm:px-6 lg:px-6 lg:pt-10 xl:px-8 2xl:max-w-7xl 2xl:px-10">
      <section className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm lg:p-6">
        <Link
          href="/instructions"
          className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
        >
          Volver a instrucciones
        </Link>

        <h1 className="mt-4 text-2xl font-extrabold text-slate-800 lg:text-[2rem]">
          Crear Nueva Instrucción
        </h1>
      </section>

      <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-6 lg:items-start">
        <NewInstructionForm profiles={teamOptions} />
      </div>
    </div>
  );
}
