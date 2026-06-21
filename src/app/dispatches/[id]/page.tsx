import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import { notFound } from "next/navigation";
import DispatchDetailsClient from "./DispatchDetailsClient";

export default async function DispatchDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;
  const supabase = await createClient();
  const { profile } = await requireAuth();

  const { data: dispatch } = await supabase
    .from("dispatch_differences")
    .select(`
      *,
      dispatch_evidences (
        id, evidence_url, notes, created_at, created_by
      )
    `)
    .eq("id", id)
    .eq("store_code", profile.store_code)
    .single();

  if (!dispatch) {
    notFound();
  }

  // Ordenar evidencias más recientes primero
  dispatch.dispatch_evidences?.sort((a: any, b: any) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return <DispatchDetailsClient dispatch={dispatch} />;
}
