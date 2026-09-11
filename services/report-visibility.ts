import { isSupabaseConfigured, supabase } from "./supabase";

export async function setSupabaseReportPublicVisibility(reportId: string, hidden: boolean) {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error("Supabase não configurado.");
  }

  const { data, error } = await supabase.rpc("set_report_public_visibility", {
    p_report_id: reportId,
    p_hidden: hidden,
  });

  if (error) throw error;
  return data;
}
