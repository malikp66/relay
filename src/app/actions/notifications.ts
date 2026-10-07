"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { requireUser } from "@/server/auth";
import { pushConfigured, sendTestNotification } from "@/server/notifications";

/** Tandai dibaca: ids tertentu, atau semua bila kosong. */
export async function markNotificationsReadAction(ids?: string[]) {
  const user = await requireUser();
  const db = await getDb();
  const mine = and(eq(s.notifications.userId, user.id), isNull(s.notifications.readAt));
  await db
    .update(s.notifications)
    .set({ readAt: new Date() })
    .where(ids?.length ? and(mine, inArray(s.notifications.id, ids)) : mine);
  return { ok: true as const };
}

export async function sendTestNotificationAction() {
  const user = await requireUser();
  await sendTestNotification(user.id);
  return { ok: true as const, push: pushConfigured() };
}
