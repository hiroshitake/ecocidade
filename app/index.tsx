import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { C } from "../constants/theme";
import { getSupabaseSessionUser, isSupabaseConfigured, supabase } from "../services/supabase";

export default function Index() {
  const [checking, setChecking] = React.useState(true);
  const [destination, setDestination] = React.useState<"/login" | "/map" | "/google-profile" | "/reset-password">("/login");

  useEffect(() => {
    let active = true;
    (async () => {
      if (!isSupabaseConfigured() || !supabase) {
        if (active) setChecking(false);
        return;
      }
      try {
        if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
          setDestination("/reset-password");
          setChecking(false);
          return;
        }
        const user = await getSupabaseSessionUser();
        if (!active) return;
        if (user) setDestination(user.city_id || user.city ? "/map" : "/google-profile");
        const subscription = supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY" && active) {
            setDestination("/reset-password");
            setChecking(false);
          }
        });
        return () => subscription.data.subscription.unsubscribe();
      } catch (error) {
        console.error("Erro ao verificar sessão inicial:", error);
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (checking) {
    return <View style={styles.container}><ActivityIndicator size="large" color={C.primary} /></View>;
  }

  return <Redirect href={destination} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.surface,
    justifyContent: "center",
    alignItems: "center",
  },
});
