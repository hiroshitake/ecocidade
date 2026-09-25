import { supabase } from "./supabase";

export interface Notification {
  id: string;
  user_id: string;
  report_id?: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export async function getNotifications(limit = 50) {
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as Notification[];
}

export async function getUnreadNotificationCount() {
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("read", false);

  if (error) throw error;
  return count || 0;
}

export async function markNotificationAsRead(notificationId: string) {
  if (!supabase) throw new Error("Supabase não configurado.");

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);

  if (error) throw error;
}

export async function markAllNotificationsAsRead() {
  if (!supabase) throw new Error("Supabase não configurado.");

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("read", false);

  if (error) throw error;
}
