import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  } catch (error: any) {
    console.error("Delete schedule error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
