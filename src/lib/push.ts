import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
};

function configureWebPush() {
  const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const privateVapidKey = process.env.VAPID_PRIVATE_KEY || "";

  if (!publicVapidKey || !privateVapidKey) {
    return false;
  }

  webpush.setVapidDetails("mailto:soporte@mi2.com", publicVapidKey, privateVapidKey);
  return true;
}

async function sendPushToUserIds(userIds: string[], payload: PushPayload) {
  if (userIds.length === 0 || !configureWebPush()) {
    return 0;
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("push_subscriptions")
    .select("id, subscription, user_id")
    .in("user_id", userIds);

  if (error || !data || data.length === 0) {
    return 0;
  }

  const subscriptions = data as Array<{
    id: string;
    subscription: webpush.PushSubscription;
    user_id: string;
  }>;

  let sentCount = 0;
  const message = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (item) => {
      try {
        await webpush.sendNotification(item.subscription, message);
        sentCount += 1;
      } catch (pushError) {
        const statusCode =
          typeof pushError === "object" && pushError !== null && "statusCode" in pushError
            ? Number(pushError.statusCode)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          await adminClient.from("push_subscriptions").delete().eq("id", item.id);
        } else {
          console.error("Push delivery error", pushError);
        }
      }
    }),
  );

  return sentCount;
}

export async function sendPushToAdmins(payload: PushPayload) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("profiles")
    .select("user_id")
    .eq("role", "admin")
    .eq("status", "activo");

  if (error || !data || data.length === 0) {
    return 0;
  }

  const userIds = (data as Array<{ user_id: string }>).map((item) => item.user_id).filter(Boolean);
  return sendPushToUserIds(userIds, payload);
}
