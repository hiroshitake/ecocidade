import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useToast } from "../context/toast-context";
import { C } from "../constants/theme";
import { requestPasswordReset } from "../services/auth";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const value = email.trim().toLowerCase();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.addToast("Informe um e-mail válido.", "error");
      return;
    }
    try {
      setLoading(true);
      await requestPasswordReset(value);
      setSent(true);
      toast.addToast("Se o e-mail estiver cadastrado, enviaremos um link de recuperação.", "success");
    } catch (error: any) {
      toast.addToast(error?.message || "Não foi possível enviar o link.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Esqueci minha senha</Text>
      <Text style={styles.description}>
        Informe seu e-mail. Você receberá um link para criar uma nova senha.
      </Text>
      <Text style={styles.label}>E-MAIL</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="seu@email.com"
        placeholderTextColor={C.text3}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!sent}
      />
      {!sent && (
        <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Enviar link</Text>}
        </TouchableOpacity>
      )}
      {sent && <Text style={styles.sent}>Verifique sua caixa de entrada e abra o link recebido.</Text>}
      <TouchableOpacity onPress={() => router.replace("/login")} style={styles.back}>
        <Text style={styles.backText}>Voltar para o login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: C.bg },
  title: { fontSize: 28, fontWeight: "800", color: C.text, marginBottom: 10 },
  description: { fontSize: 15, color: C.text2, lineHeight: 22, marginBottom: 28 },
  label: { fontSize: 12, fontWeight: "800", color: C.text2, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: C.text, backgroundColor: C.surface },
  button: { marginTop: 18, minHeight: 50, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.primary },
  buttonText: { color: "white", fontSize: 16, fontWeight: "800" },
  sent: { marginTop: 18, color: C.eco, fontWeight: "700", lineHeight: 21 },
  back: { marginTop: 22, alignItems: "center" },
  backText: { color: C.primary, fontWeight: "700" },
});
