import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { C } from "../constants/theme";
import { getSupabaseSessionUser, isSupabaseConfigured, supabase } from "../services/supabase";

type Destination = "/login" | "/map" | "/google-profile" | "/reset-password";

export default function Index() {
  const [checking, setChecking] = React.useState(true);
  const [destination, setDestination] = React.useState<Destination>("/login");

  useEffect(() => {
    let active = true;
    const subscription = supabase?.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") {
        setDestination("/reset-password");
        setChecking(false);
      }
    });

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
      } catch (error) {
        console.error("Erro ao verificar sessão inicial:", error);
      } finally {
        if (active) setChecking(false);
      }
    })();

    return () => {
      active = false;
      subscription?.data.subscription.unsubscribe();
    };
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
