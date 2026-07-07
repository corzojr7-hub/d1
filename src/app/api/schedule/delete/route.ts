import { NextResponse } from "next/server";

import { requireSupervisor } from "@/lib/supabase/require-auth";

export async function POST(request: Request) {
  try {
    const { profile, supabase } = await requireSupervisor();

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("weekly_schedules")
      .delete()
      .eq("id", id)
      .eq("profile_id", profile.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete schedule error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
