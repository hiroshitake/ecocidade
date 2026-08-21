import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  getSupabaseSessionUser,
  isSupabaseConfigured,
  signInWithSupabase,
  signOutFromSupabase,
  signUpWithSupabase,
  supabase,
  updateSupabaseProfile,
} from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const AUTH_TOKEN_KEY = "ecocidade.token";
const AUTH_USER_KEY = "ecocidade.user";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  city?: string;
  birthdate?: string;
}

interface AuthResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  token: string;
}

function getBaseUrl() {
  if (Platform.OS === "web") {
    return API_URL;
  }

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
    const message =
      typeof body === "string" ? body : body?.error || "Falha na requisição";
    throw new Error(message);
  }

  return body as T;
}

export async function signUp(
  email: string,
  password: string,
  name: string,
  city?: string,
) {
  if (isSupabaseConfigured()) {
    const data = await signUpWithSupabase(email, password, name, city);
    const user = data.user;
    if (user) {
      await AsyncStorage.setItem(
        AUTH_USER_KEY,
        JSON.stringify({
          id: user.id,
          email: user.email,
          name,
          role: "user",
          city,
        }),
      );
    }
    return {
      id: user?.id || "",
      email,
      name,
      role: "user",
      city,
      token: "",
    } as AuthResponse;
  }

  throw new Error(
    "Supabase não configurado. Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export async function signIn(email: string, password: string) {
  if (isSupabaseConfigured()) {
    await signInWithSupabase(email, password);
    const user = await getSupabaseSessionUser();
    if (user) {
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    }
    return {
      id: user?.id || "",
      email,
      name: user?.name || email,
      role: user?.role || "user",
      token: "",
    } as AuthResponse;
  }

  throw new Error(
    "Supabase não configurado. Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export async function signInAdmin(email: string, password: string) {
  if (isSupabaseConfigured()) {
    await signInWithSupabase(email, password);
    const user = await getSupabaseSessionUser();
    if (user) {
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    }
    return {
      id: user?.id || "",
      email: user?.email || email,
      name: user?.name || email,
      role: user?.role || "admin",
      token: "",
    } as AuthResponse;
  }

  throw new Error(
    "Supabase não configurado. Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export async function logout() {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  await AsyncStorage.removeItem(AUTH_USER_KEY);
  if (isSupabaseConfigured()) {
    await signOutFromSupabase();
  }
}

export async function getCurrentUserData(): Promise<AuthUser | null> {
  if (isSupabaseConfigured()) {
    const user = await getSupabaseSessionUser();
    if (user) {
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      return user;
    }
  }

  const storedUser = await AsyncStorage.getItem(AUTH_USER_KEY);
  if (!storedUser) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedUser) as AuthUser;
    return parsed;
  } catch {
    return null;
  }
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<AuthUser>,
) {
  if (isSupabaseConfigured()) {
    const data = await updateSupabaseProfile(userId, updates);
    const currentUser = await getCurrentUserData();
    if (currentUser?.id === userId) {
      await AsyncStorage.setItem(
        AUTH_USER_KEY,
        JSON.stringify({ ...currentUser, ...data, ...updates }),
      );
    }
    return data;
  }

  throw new Error(
    "Supabase não configurado. Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export async function getUserCityCenterFallback(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  const user = await getCurrentUserData();
  const cityName = user?.city?.trim();

  if (!cityName || !supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("cities")
      .select("latitude, longitude")
      .ilike("name", cityName)
      .maybeSingle();

    if (error) {
      console.warn(
        "Erro ao buscar centro da cidade do usuário:",
        error.message,
      );
      return null;
    }

    const latitude = Number(data?.latitude);
    const longitude = Number(data?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return { latitude, longitude };
  } catch (error) {
    console.warn("Falha ao resolver centro da cidade do usuário:", error);
    return null;
  }
}

export async function resolveUserLocationWithFallback(): Promise<{
  location: { latitude: number; longitude: number } | null;
  source: "gps" | "city" | "none";
  reason:
    | "gps"
    | "gps_unavailable"
    | "permission_denied"
    | "city_fallback";
}> {
  const fallbackPromise = getUserCityCenterFallback();

  const isLocalhostWeb =
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    /localhost|127\.0\.0\.1/.test(window.location.hostname);

  if (isLocalhostWeb) {
    const fallback = await fallbackPromise;
    return {
      location: fallback,
      source: fallback ? "city" : "none",
      reason: fallback ? "city_fallback" : "gps_unavailable",
    };
  }

  if (
    Platform.OS === "web" &&
    typeof navigator !== "undefined" &&
    navigator.geolocation
  ) {
    return await new Promise((resolve) => {
      const fallbackTimer = setTimeout(async () => {
        const fallback = await fallbackPromise;
        resolve({
          location: fallback,
          source: fallback ? "city" : "none",
          reason: fallback ? "city_fallback" : "gps_unavailable",
        });
      }, 1200);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(fallbackTimer);
          resolve({
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            source: "gps",
            reason: "gps",
          });
        },
        async (error) => {
          clearTimeout(fallbackTimer);
          const fallback = await fallbackPromise;
          resolve({
            location: fallback,
            source: fallback ? "city" : "none",
            reason:
              error?.code === 1
                ? "permission_denied"
                : fallback
                  ? "city_fallback"
                  : "gps_unavailable",
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 1200,
          maximumAge: 30000,
        },
      );
    });
  }

  try {
    const { status } = await import("expo-location").then((m) =>
      m.default.requestForegroundPermissionsAsync(),
    );
    if (status !== "granted") {
      const fallback = await fallbackPromise;
      return {
        location: fallback,
        source: fallback ? "city" : "none",
        reason: fallback ? "permission_denied" : "permission_denied",
      };
    }

    const loc = await import("expo-location").then((m) =>
      Promise.race([
        m.default.getCurrentPositionAsync({
          accuracy: m.default.Accuracy.Balanced,
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2200)),
      ]),
    );

    if (loc) {
      return {
        location: {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        },
        source: "gps",
        reason: "gps",
      };
    }

    const fallback = await fallbackPromise;
    return {
      location: fallback,
      source: fallback ? "city" : "none",
      reason: fallback ? "city_fallback" : "gps_unavailable",
    };
  } catch {
    const fallback = await fallbackPromise;
    return {
      location: fallback,
      source: fallback ? "city" : "none",
      reason: fallback ? "city_fallback" : "gps_unavailable",
    };
  }
}

export async function resolveUserLocationForSubmission() {
  const result = await resolveUserLocationWithFallback();

  if (result.source !== "gps") {
    return { ...result, location: null, source: "none" as const };
  }

  return result;
}
