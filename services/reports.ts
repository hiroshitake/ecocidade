import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentUserData } from "./auth";
import {
  createSupabaseDangerZone,
  createSupabaseReport,
  deleteSupabaseDangerZone,
  deleteSupabaseReport,
  isSupabaseConfigured,
  listSupabaseDangerZones,
  listSupabaseReports,
  supabase,
  updateSupabaseReportStatus,
} from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const AUTH_TOKEN_KEY = "ecocidade.token";

function getBaseUrl() {
  return API_URL;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(
      typeof body === "string" ? body : body?.error || "Falha na requisição",
    );
  }

  return body as T;
}

export async function createReport(_userId: string | undefined, payload: any) {
  const user = await getCurrentUserData();
  const city = payload?.city || user?.city || undefined;

  if (isSupabaseConfigured()) {
    return createSupabaseReport({
      title: payload?.category || "Denúncia",
      description: payload?.description || "Denúncia enviada pelo app.",
      latitude: payload?.location?.latitude || 0,
      longitude: payload?.location?.longitude || 0,
      category: payload?.category || "other",
      severity: "medium",
      status: "pending",
      city,
      imageUri: payload?.imageUri,
    });
  }

  throw new Error(
    "Supabase não configurado. Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export async function getMyReports() {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUserData();
    const reports = await listSupabaseReports();

    if (!user?.id) {
      return [];
    }

    return (reports || [])
      .filter((report: any) => {
        const userId = String(report?.user_id || "");
        return userId === String(user.id);
      })
      .sort((a: any, b: any) => {
        const aTime = new Date(a?.created_at || 0).getTime();
        const bTime = new Date(b?.created_at || 0).getTime();
        return bTime - aTime;
      });
  }

  throw new Error(
    "Supabase não configurado. Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export async function getPublicReports() {
  if (isSupabaseConfigured()) {
    const reports = await listSupabaseReports();
    return (reports || []).filter((report: any) => {
      const category = String(report?.category || "").toLowerCase();
      return category !== "seguranca";
    });
  }

  throw new Error(
    "Supabase não configurado. Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export async function getAllReports() {
  if (isSupabaseConfigured()) {
    return listSupabaseReports();
  }

  throw new Error(
    "Supabase não configurado. Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export async function getAdminReports() {
  if (isSupabaseConfigured()) {
    const reports = await listSupabaseReports();
    const userIds = Array.from(
      new Set(
        (reports || [])
          .map((report: any) => report?.user_id)
          .filter((id: unknown): id is string => typeof id === "string" && id.length > 0),
      ),
    );

    if (!supabase || userIds.length === 0) {
      return reports;
    }

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", userIds);

    if (error) {
      console.warn("Não foi possível carregar os dados dos denunciantes:", error.message);
      return reports;
    }

    const profilesById = new Map(
      (profiles || []).map((profile: any) => [profile.id, profile]),
    );

    return (reports || []).map((report: any) => ({
      ...report,
      reporter: report.user_id ? profilesById.get(report.user_id) || null : null,
    }));
  }

  throw new Error(
    "Supabase não configurado. Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export async function updateReportStatus(reportId: string, status: string) {
  if (isSupabaseConfigured()) {
    return updateSupabaseReportStatus(reportId, status);
  }

  throw new Error(
    "Supabase não configurado. Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export async function deleteReport(reportId: string) {
  if (isSupabaseConfigured()) {
    return deleteSupabaseReport(reportId);
  }

  throw new Error(
    "Supabase não configurado. Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export async function createDangerZone(payload: any) {
  if (isSupabaseConfigured()) {
    return createSupabaseDangerZone(payload);
  }

  throw new Error(
    "Supabase não configurado. Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export async function getDangerZones() {
  if (isSupabaseConfigured()) {
    return listSupabaseDangerZones();
  }

  throw new Error(
    "Supabase não configurado. Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export async function deleteDangerZone(id: string) {
  if (isSupabaseConfigured()) {
    return deleteSupabaseDangerZone(id);
  }

  throw new Error(
    "Supabase não configurado. Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}
