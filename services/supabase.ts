import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.VITE_PUBLIC_SUPABASE_URL ||
  "";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_PUBLIC_SUPABASE_ANON_KEY ||
  "";
const appSiteUrl = (
  process.env.EXPO_PUBLIC_SITE_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  "https://ecocidadetcc2026.netlify.app"
).replace(/\/$/, "");
const emailRedirectUrl = `${appSiteUrl}/auth/callback`;

let client: SupabaseClient | null = null;

const isServer = typeof window === "undefined";

const DummyStorage = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
};

if (supabaseUrl && supabaseAnonKey) {
  const customStorage = isServer
    ? DummyStorage
    : Platform.OS === "web" && window.localStorage
      ? window.localStorage
      : AsyncStorage;

  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: !isServer,
      autoRefreshToken: !isServer,
      storage: customStorage,
      detectSessionInUrl: Platform.OS === "web" && !isServer,
    },
  });
}

export const supabase = client;

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey && supabase);
}

export async function signInWithSupabase(email: string, password: string) {
  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;

  return data;
}

async function getCityIdByName(cityName?: string | null) {
  if (!supabase || !cityName) return null;

  const { data, error } = await supabase
    .from("cities")
    .select("id")
    .eq("name", cityName)
    .maybeSingle();
  if (error) {
    console.warn("Erro ao buscar cidade no Supabase:", error.message);
    return null;
  }

  return data?.id ?? null;
}

export async function signUpWithSupabase(
  email: string,
  password: string,
  name: string,
  city?: string,
) {
  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: emailRedirectUrl,
    },
  });
  if (error) throw error;

  if (data.user) {
    const cityId = await getCityIdByName(city);
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      name,
      email,
      role: "user",
      city: city || null,
      city_id: cityId,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.warn(
        "Erro ao criar perfil inicial no Supabase:",
        profileError.message,
      );
    }
  }

  return data;
}

export async function signOutFromSupabase() {
  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSupabaseSessionUser() {
  if (!supabase) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return {
    id: user.id,
    email: user.email || "",
    name: profile?.name || user.email || "",
    role: profile?.role || "user",
    city: typeof profile?.city === "string" ? profile.city : undefined,
    city_id: typeof profile?.city_id === "string" ? profile.city_id : undefined,
  };
}

export async function updateSupabaseProfile(
  userId: string,
  updates: Record<string, unknown>,
) {
  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }

  const nextUpdates: Record<string, unknown> = { ...updates };
  if (typeof nextUpdates.city === "string" && nextUpdates.city.trim()) {
    const cityId = await getCityIdByName(nextUpdates.city);
    nextUpdates.city_id = cityId ?? null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...nextUpdates })
    .select()
    .single();
  if (error) throw error;

  return data;
}

export async function createSupabaseReport(payload: Record<string, unknown>) {
  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }

  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("Localização inválida. Não foi possível validar o GPS.");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id || (payload.user_id as string) || null;

  let city =
    typeof payload.city === "string" && payload.city ? payload.city : undefined;
  let cityId =
    typeof payload.city_id === "string" && payload.city_id
      ? payload.city_id
      : undefined;

  if (!city && userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("city, city_id")
      .eq("id", userId)
      .maybeSingle();
    city = typeof profile?.city === "string" ? profile.city : undefined;
    cityId = typeof profile?.city_id === "string" ? profile.city_id : undefined;
  }

  if (!cityId && city) {
    cityId = (await getCityIdByName(city)) ?? undefined;
  }

  // Validate report location against city center/radius in `cities` table
  try {
    if (cityId) {
      const { data: cityRec, error: cityErr } = await supabase
        .from("cities")
        .select("id, name, latitude, longitude, radius_m")
        .eq("id", cityId)
        .maybeSingle();

      if (cityErr) {
        console.warn("Erro ao buscar cidade para validação:", cityErr.message);
      } else if (cityRec) {
        const toRad = (v: number) => (v * Math.PI) / 180;
        const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 6371000;
          const dLat = toRad(lat2 - lat1);
          const dLon = toRad(lon2 - lon1);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        const distance = haversine(Number(cityRec.latitude), Number(cityRec.longitude), latitude, longitude);
        const radius = Number(cityRec.radius_m ?? (cityRec as any).radius ?? 0);
        if (isFinite(distance) && radius && distance > radius) {
          throw new Error("Denúncia fora da área permitida da cidade.");
        }
      }
    }
  } catch (err) {
    // Rethrow validation error so callers (client) can map message to UX
    if (err instanceof Error && err.message && err.message.includes("fora da área")) {
      throw err;
    }
    // otherwise continue and let insertion proceed if validation cannot be performed
    console.warn("Validação de localização não pôde ser concluída:", err);
  }

  const { data, error } = await supabase
    .from("reports")
    .insert({
      user_id: userId,
      title: payload.title,
      description: payload.description,
      latitude,
      longitude,
      category: payload.category,
      severity: payload.severity || "medium",
      status: payload.status || "pending",
      city: city || null,
      city_id: cityId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listSupabaseReports() {
  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateSupabaseReportStatus(
  reportId: string,
  status: string,
) {
  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }

  const { data, error } = await supabase
    .from("reports")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSupabaseReport(reportId: string) {
  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }

  const { error } = await supabase.from("reports").delete().eq("id", reportId);
  if (error) throw error;
  return { id: reportId };
}

export async function createSupabaseDangerZone(
  payload: Record<string, unknown>,
) {
  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }

  const { data, error } = await supabase
    .from("danger_zones")
    .insert({
      name: payload.name,
      description: payload.description,
      latitude: payload.latitude,
      longitude: payload.longitude,
      radius: payload.radius,
      severity: payload.severity || "media",
      active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listSupabaseDangerZones() {
  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }

  const { data, error } = await supabase
    .from("danger_zones")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function deleteSupabaseDangerZone(id: string) {
  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }

  const { error } = await supabase.from("danger_zones").delete().eq("id", id);
  if (error) throw error;
  return { id };
}
