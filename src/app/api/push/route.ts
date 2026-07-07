import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import webpush from "web-push";

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || "";

function configureWebPush() {
  if (!publicVapidKey || !privateVapidKey) {
    return false;
  }

  webpush.setVapidDetails("mailto:soporte@mi2.com", publicVapidKey, privateVapidKey);
  return true;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, subscription, payload } = body;

    if (action === "subscribe") {
      const { data: existing } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("subscription->>endpoint", subscription.endpoint)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("push_subscriptions")
          .update({ subscription })
          .eq("id", existing.id);
      } else {
        await supabase.from("push_subscriptions").insert({
          user_id: user.id,
          subscription,
        });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "test_push") {
      if (!configureWebPush()) {
        return NextResponse.json({ error: "Push no configurado" }, { status: 500 });
      }

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("subscription")
        .eq("user_id", user.id);

      if (subs) {
        const promises = subs.map((sub) =>
          webpush.sendNotification(
            sub.subscription as webpush.PushSubscription,
            JSON.stringify(payload || { title: "Test", body: "Test body" })
          ).catch((e) => console.error("Push error", e))
        );
        await Promise.all(promises);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Push API error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
