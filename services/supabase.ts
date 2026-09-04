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

async function uploadReportPhoto(imageUri: string, userId: string) {
  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }

  const response = await fetch(imageUri);
  if (!response.ok) {
    throw new Error("Não foi possível ler a foto selecionada.");
  }

  const arrayBuffer = await response.arrayBuffer();
  const mimeType = response.headers.get("content-type") || "image/jpeg";
  const extension = mimeType.split("/")[1]?.split(";")[0] || "jpeg";
  const safeExtension = extension === "jpg" ? "jpg" : extension;
  const filePath = `${userId}/${crypto.randomUUID()}.${safeExtension}`;

  const { data, error } = await supabase.storage
    .from("reports")
    .upload(filePath, arrayBuffer, {
      contentType: mimeType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;
  return data.path;
}

export async function createSupabaseReport(payload: Record<string, unknown>) {
  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }

  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  console.log("[REPORT DEBUG] localização recebida:", {
    latitude,
    longitude,
    payloadLatitude: payload.latitude,
    payloadLongitude: payload.longitude,
  });

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

  if (!userId) {
    throw new Error("Usuário não autenticado. Não é possível validar a cidade.");
  }

  let city =
    typeof payload.city === "string" && payload.city ? payload.city : undefined;
  let cityId =
    typeof payload.city_id === "string" && payload.city_id
      ? payload.city_id
      : undefined;

  if (!cityId) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("city, city_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Não foi possível validar a cidade do usuário: ${profileError.message}`);
    }

    city = typeof profile?.city === "string" ? profile.city : city;
    cityId = typeof profile?.city_id === "string" ? profile.city_id : undefined;
  }

  if (!cityId && city) {
    cityId = (await getCityIdByName(city)) ?? undefined;
  }

  if (!cityId) {
    throw new Error("Usuário sem cidade cadastrada. Não é possível validar a localização.");
  }

  const { data: cityRec, error: cityErr } = await supabase
    .from("cities")
    .select("id, name, latitude, longitude, radius_m")
    .eq("id", cityId)
    .maybeSingle();

  if (cityErr) {
    throw new Error(`Não foi possível validar a área da cidade: ${cityErr.message}`);
  }

  if (!cityRec) {
    throw new Error("Cidade do usuário não encontrada. Não é possível validar a localização.");
  }

  const cityLatitude = Number(cityRec.latitude);
  const cityLongitude = Number(cityRec.longitude);
  const radius = Number(cityRec.radius_m);

  console.log("[REPORT DEBUG] cidade usada na validação:", {
    name: cityRec.name,
    latitude: cityLatitude,
    longitude: cityLongitude,
    radius_m: radius,
    cityId,
  });

  if (
    !Number.isFinite(cityLatitude) ||
    !Number.isFinite(cityLongitude) ||
    !Number.isFinite(radius) ||
    radius <= 0
  ) {
    throw new Error("A cidade não possui uma área de cobertura válida configurada.");
  }

  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(latitude - cityLatitude);
  const dLon = toRad(longitude - cityLongitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(cityLatitude)) *
      Math.cos(toRad(latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const distance =
    2 * 6371000 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  console.log("[REPORT DEBUG] validação geográfica:", {
    distance_m: distance,
    radius_m: radius,
    inside: distance <= radius,
  });

  if (!Number.isFinite(distance)) {
    throw new Error("Não foi possível calcular a distância da denúncia.");
  }

  if (distance > radius) {
    throw new Error("Denúncia fora da área permitida da cidade.");
  }

  let uploadedPhotoPath: string | null = null;

  try {
    if (typeof payload.imageUri === "string" && payload.imageUri.trim()) {
      uploadedPhotoPath = await uploadReportPhoto(payload.imageUri, userId);
    }

    console.log("[REPORT DEBUG] passou pela validação; executando INSERT em reports");

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
        city: cityRec.name,
        city_id: cityId,
        image_url: uploadedPhotoPath,
      })
      .select()
      .single();

    if (error) {
      if (uploadedPhotoPath) {
        await supabase.storage.from("reports").remove([uploadedPhotoPath]);
      }
      console.error("[REPORT DEBUG] erro no INSERT de reports:", error);
      throw error;
    }

    console.log("[REPORT DEBUG] INSERT realizado com sucesso:", data);
    return data;
  } catch (error) {
    if (uploadedPhotoPath) {
      await supabase.storage.from("reports").remove([uploadedPhotoPath]);
    }
    throw error;
  }
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

export async function createReportImageUrl(path: string) {
  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }

  const { data, error } = await supabase.storage
    .from("reports")
    .createSignedUrl(path, 60 * 60);

  if (error) throw error;
  return data.signedUrl;
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
