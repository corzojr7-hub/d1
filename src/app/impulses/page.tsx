import { requireAuth } from "@/lib/supabase/require-auth";
import ClientImpulses from "./ClientImpulses";

export default async function ImpulsesPage() {
  const { profile } = await requireAuth();

  return (
    <ClientImpulses assistants={profile.assistants || []} />
  );
}
