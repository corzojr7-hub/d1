import { requireAuth } from "@/lib/supabase/require-auth";
import ClientHandover from "./ClientHandover";

export default async function HandoverPage() {
  const { profile } = await requireAuth();

  if (!profile) {
    return (
      <div className="p-4 text-slate-500 text-center mt-10">
        No se encontró el perfil. Actualiza tu configuración de Equipo.
      </div>
    );
  }

  const supervisors = [profile.supervisor_name, profile.second_in_charge, profile.third_in_charge].filter(Boolean);

  return (
    <ClientHandover
      supervisors={supervisors}
    />
  );
}
