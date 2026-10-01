import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { C } from "../constants/theme";
import { useToast } from "../context/toast-context";
import { supabase, updateSupabasePassword } from "../services/supabase";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!supabase) return;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted && data.session) setReady(true);
    };

    checkSession();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const submit = async () => {
    if (password.length < 6) {
      toast.addToast("A nova senha deve ter no mínimo 6 caracteres.", "error");
      return;
    }
    if (password !== confirmation) {
      toast.addToast("As senhas não coincidem.", "error");
      return;
    }

    try {
      setLoading(true);
      await updateSupabasePassword(password);
      toast.addToast("Senha alterada com sucesso.", "success");
      await supabase?.auth.signOut();
      router.replace("/login");
    } catch (error: any) {
      toast.addToast(error?.message || "Não foi possível alterar a senha. Solicite um novo link.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Criar nova senha</Text>
      <Text style={styles.description}>
        {ready ? "Digite sua nova senha abaixo." : "Validando o link de recuperação..."}
      </Text>
      {ready ? (
        <>
          <Text style={styles.label}>NOVA SENHA</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Mínimo 6 caracteres" placeholderTextColor={C.text3} />
          <Text style={styles.label}>CONFIRMAR SENHA</Text>
          <TextInput style={styles.input} value={confirmation} onChangeText={setConfirmation} secureTextEntry placeholder="Repita a nova senha" placeholderTextColor={C.text3} />
          <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Salvar nova senha</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <ActivityIndicator color={C.primary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: C.bg },
  title: { fontSize: 28, fontWeight: "800", color: C.text, marginBottom: 10 },
  description: { fontSize: 15, color: C.text2, lineHeight: 22, marginBottom: 28 },
  label: { fontSize: 12, fontWeight: "800", color: C.text2, marginBottom: 8, marginTop: 14 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: C.text, backgroundColor: C.surface },
  button: { marginTop: 20, minHeight: 50, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.primary },
  buttonText: { color: "white", fontSize: 16, fontWeight: "800" },
});
