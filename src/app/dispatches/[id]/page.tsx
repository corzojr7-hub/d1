import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import { notFound } from "next/navigation";
import DispatchDetailsClient from "./DispatchDetailsClient";

type DispatchEvidence = {
  id: string;
  created_at: string;
  evidence_url: string;
  notes: string | null;
};

type DispatchRecord = {
  id: string;
  status: string;
  created_at: string;
  dispatch_date: string;
  truck_plate: string;
  driver_name: string;
  category: string;
  description: string;
  initial_evidence_url: string | null;
  dispatch_evidences?: DispatchEvidence[] | null;
};

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

  const typedDispatch = dispatch as DispatchRecord | null;

  if (!typedDispatch) {
    notFound();
  }

  // Ordenar evidencias más recientes primero
  typedDispatch.dispatch_evidences?.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return <DispatchDetailsClient dispatch={typedDispatch} />;
}
