import { NextResponse } from "next/server";
import { requireSupervisor } from "@/lib/supabase/require-auth";

function normalizeNote(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 280) : "";
}

export async function POST(request: Request) {
  try {
    const { profile, supabase } = await requireSupervisor();

    let payload: Record<string, unknown> | null = null;
    try {
      payload = (await request.json()) as Record<string, unknown>;
    } catch {
      payload = null;
    }

    const scheduleId = typeof payload?.scheduleId === "string" ? payload.scheduleId.trim() : "";
    if (!scheduleId) {
      return NextResponse.json({ error: "scheduleId is required" }, { status: 400 });
    }

    const approvalNote = normalizeNote(payload?.approvalNote);

    const { data: schedule, error: fetchError } = await supabase
      .from("weekly_schedules")
      .select("id, profile_id, status, source, approved_at, approved_by_profile_id, approval_note")
      .eq("id", scheduleId)
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    if (schedule.status === "approved") {
      return NextResponse.json({
        success: true,
        alreadyApproved: true,
        schedule,
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from("weekly_schedules")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by_profile_id: profile.id,
        approval_note: approvalNote || null,
        source: schedule.source ?? "generated",
      })
      .eq("id", scheduleId)
      .eq("profile_id", profile.id)
      .select("id, profile_id, status, source, approved_at, approved_by_profile_id, approval_note")
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      schedule: updated,
    });
  } catch (error: unknown) {
    console.error("Approve schedule error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
