import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { InlineError } from "../components/InlineError";
import { C, S } from "../constants/theme";
import { useToast } from "../context/toast-context";
import { formatBirthDate } from "../functions/masks";
import { getCurrentUserData, signIn, signUp } from "../services/auth";
import {
    getSupabaseSessionUser,
    isSupabaseConfigured,
    signInWithSupabase,
    signUpWithSupabase,
} from "../services/supabase";

export default function LoginScreen() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    password: "",
    name: "",
    birthdate: "",
    city: "",
  });
  const router = useRouter();
  const toast = useToast();

  const cityOptions = [
    { id: "orlândia", name: "Orlândia" },
    { id: "morro-agudo", name: "Morro Agudo" },
    { id: "sales-oliveira", name: "Sales Oliveira" },
    { id: "nuporanga", name: "Nuporanga" },
  ];

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const isValidBirthdate = (value: string) => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
    const [day, month, year] = value.split("/").map(Number);
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  };

  const setError = (field: keyof typeof fieldErrors, message: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  };

  const clearErrors = () => {
    setFieldErrors({
      email: "",
      password: "",
      name: "",
      birthdate: "",
      city: "",
    });
  };

  const handleTabChange = (nextTab: "login" | "register") => {
    setTab(nextTab);
    clearErrors();
  };

  const handleAuth = async () => {
    clearErrors();

    if (!email.trim()) {
      setError("email", "Informe seu e-mail.");
      return;
    }

    if (!isValidEmail(email.trim())) {
      setError("email", "Informe um e-mail válido.");
      return;
    }

    if (!password.trim()) {
      setError("password", "Informe sua senha.");
      return;
    }

    if (password.length < 6) {
      setError("password", "A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    try {
      setLoading(true);
      let currentUser = null;

      if (isSupabaseConfigured()) {
        await signInWithSupabase(email.trim().toLowerCase(), password);
        currentUser = await getSupabaseSessionUser();
        if (currentUser) {
          await AsyncStorage.setItem(
            "ecocidade.user",
            JSON.stringify(currentUser),
          );
        }
      } else {
        await signIn(email.trim().toLowerCase(), password);
        currentUser = await getCurrentUserData();
      }

      // After login, do not force city selection. Always go to map.
      router.replace("/map");
    } catch (error: any) {
      console.error("Erro no login:", error);
      let msg = error.message || "Não foi possível entrar.";
      if (msg.includes("Invalid login credentials")) {
        msg =
          'E-mail ou senha incorretos. Se você ainda não tem conta, acesse a aba "Cadastrar".';
      } else if (msg.includes("Email not confirmed")) {
        msg = "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
      }
      toast.addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    clearErrors();

    if (!name.trim()) {
      setError("name", "Informe seu nome completo.");
      return;
    }

    if (name.trim().length < 2) {
      setError("name", "O nome deve ter pelo menos 2 caracteres.");
      return;
    }

    if (!email.trim()) {
      setError("email", "Informe seu e-mail.");
      return;
    }

    if (!isValidEmail(email.trim())) {
      setError("email", "Informe um e-mail válido.");
      return;
    }

    if (!password.trim()) {
      setError("password", "Informe uma senha.");
      return;
    }

    if (password.length < 6) {
      setError("password", "A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (birthdate.trim() && !isValidBirthdate(birthdate.trim())) {
      setError("birthdate", "Data inválida. Use o formato DD/MM/AAAA.");
      return;
    }

    if (!selectedCity) {
      setError("city", "Selecione sua cidade.");
      return;
    }

    try {
      setLoading(true);
      const cityName = cityOptions.find((c) => c.id === selectedCity)?.name;
      if (isSupabaseConfigured()) {
        const res = await signUpWithSupabase(
          email.trim().toLowerCase(),
          password,
          name.trim(),
          cityName,
        );
        const user = await getSupabaseSessionUser();
        if (user) {
          await AsyncStorage.setItem("ecocidade.user", JSON.stringify(user));
        } else if (res.user && !res.session) {
          Alert.alert(
            "Conta Criada com Sucesso!",
            "Sua conta foi criada.\n\nSe a confirmação de e-mail estiver desativada, já pode entrar. Caso contrário, confirme o e-mail recebido.",
          );
          setTab("login");
          return;
        }
      } else {
        await signUp(
          email.trim().toLowerCase(),
          password,
          name.trim(),
          cityName,
        );
      }

      // After successful registration, go to map (profile already contains city)
      router.replace("/map");
    } catch (error: any) {
      console.error("Erro no cadastro:", error);
      let msg = error.message || "Não foi possível criar a conta.";
      const lowerMsg = msg.toLowerCase();
      if (
        lowerMsg.includes("already registered") ||
        lowerMsg.includes("already been registered") ||
        lowerMsg.includes("email already") ||
        lowerMsg.includes("user already")
      ) {
        msg = "E-mail já cadastrado";
      }
      toast.addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.root} bounces={false}>
        <LinearGradient
          colors={["#1a5fd4", "#0d3d96"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.4, y: 1 }}
          style={styles.header}
        >
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Ionicons name="leaf" size={26} color="white" />
            </View>
            <View>
              <Text style={styles.logoText}>
                ECO<Text style={styles.logoGreen}>cidade</Text>
              </Text>
              <Text style={styles.logoSub}>
                Zeladoria &amp; Segurança Urbana
              </Text>
            </View>
          </View>
          <Text style={styles.headline}>Sua cidade mais inteligente.</Text>
          <Text style={styles.subheadline}>
            Reporte problemas, acompanhe resoluções e fique seguro.
          </Text>
        </LinearGradient>

        <View style={styles.formArea}>
          <View style={styles.tabBar}>
            {(["login", "register"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                onPress={() => handleTabChange(t)}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    tab === t && styles.tabBtnTextActive,
                  ]}
                >
                  {t === "login" ? "Entrar" : "Cadastrar"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === "login" && (
            <View>
              <Text style={styles.label}>E-MAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor={C.text3}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (fieldErrors.email) setError("email", "");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <InlineError
                message={fieldErrors.email}
                visible={Boolean(fieldErrors.email)}
              />

              <Text style={styles.label}>SENHA</Text>
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={C.text3}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (fieldErrors.password) setError("password", "");
                  }}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPass((prev) => !prev)}
                >
                  <Ionicons
                    name={showPass ? "eye-off" : "eye"}
                    size={20}
                    color={C.text3}
                  />
                </TouchableOpacity>
              </View>
              <InlineError
                message={fieldErrors.password}
                visible={Boolean(fieldErrors.password)}
              />

              <TouchableOpacity style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Esqueceu a senha?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="log-in" size={20} color="white" />
                    <Text style={styles.btnText}>Entrar</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou continue com</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.btnOutline}
                onPress={() =>
                  Alert.alert(
                    "Em breve",
                    "O login com Google será habilitado em seguida.",
                  )
                }
              >
                <Text style={styles.btnOutlineText}>🇬 Google</Text>
              </TouchableOpacity>
            </View>
          )}

          {tab === "register" && (
            <View>
              <Text style={styles.label}>NOME COMPLETO</Text>
              <TextInput
                style={styles.input}
                placeholder="Seu nome completo"
                placeholderTextColor={C.text3}
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  if (fieldErrors.name) setError("name", "");
                }}
              />
              <InlineError
                message={fieldErrors.name}
                visible={Boolean(fieldErrors.name)}
              />

              <Text style={styles.label}>DATA DE NASCIMENTO</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={C.text3}
                value={birthdate}
                keyboardType="numeric"
                onChangeText={(value) => {
                  const formattedValue = formatBirthDate(value);
                  setBirthdate(formattedValue);
                  if (fieldErrors.birthdate) setError("birthdate", "");
                }}
              />
              <InlineError
                message={fieldErrors.birthdate}
                visible={Boolean(fieldErrors.birthdate)}
              />

              <Text style={styles.label}>CIDADE</Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                {cityOptions.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.cityOption,
                      selectedCity === item.id && styles.cityOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedCity(item.id);
                      if (fieldErrors.city) setError("city", "");
                    }}
                  >
                    <Text
                      style={[
                        styles.cityOptionText,
                        selectedCity === item.id && styles.cityOptionTextActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <InlineError
                message={fieldErrors.city}
                visible={Boolean(fieldErrors.city)}
              />

              <Text style={styles.label}>E-MAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor={C.text3}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (fieldErrors.email) setError("email", "");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <InlineError
                message={fieldErrors.email}
                visible={Boolean(fieldErrors.email)}
              />

              <Text style={styles.label}>SENHA</Text>
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={C.text3}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (fieldErrors.password) setError("password", "");
                }}
                secureTextEntry
              />
              <InlineError
                message={fieldErrors.password}
                visible={Boolean(fieldErrors.password)}
              />

              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: C.eco }]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={20} color="white" />
                    <Text style={styles.btnText}>Criar conta</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.adminArea}>
            <TouchableOpacity
              style={styles.adminBtn}
              onPress={() => router.push("/admin-login")}
            >
              <Ionicons name="shield-checkmark" size={18} color={C.primary} />
              <Text style={styles.adminBtnText}>
                Acesso do Servidor / Admin
              </Text>
              <Ionicons name="chevron-forward" size={16} color={C.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 48,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 32,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  logoText: {
    fontSize: 26,
    fontWeight: "800",
    color: "white",
    letterSpacing: -0.5,
  },
  logoGreen: { color: "#4ade80" },
  logoSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: "500" },
  headline: {
    fontSize: 28,
    fontWeight: "800",
    color: "white",
    lineHeight: 34,
    marginBottom: 8,
  },
  subheadline: { color: "rgba(255,255,255,0.75)", fontSize: 14 },
  formArea: { backgroundColor: C.surface, padding: 24, paddingBottom: 48 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: C.surface2,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: C.surface, ...S.shadow.sm },
  tabBtnText: { fontSize: 14, fontWeight: "600", color: C.text2 },
  tabBtnTextActive: { color: C.primary },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: C.text3,
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: C.surface2,
    color: C.text,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 8,
  },
  eyeBtn: { position: "absolute", right: 14, top: 13 },
  forgotBtn: { alignSelf: "flex-end", marginBottom: 24, marginTop: -8 },
  forgotText: { fontSize: 13, color: C.primary, fontWeight: "600" },
  btnPrimary: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...S.shadow.sm,
  },
  btnText: { color: "white", fontSize: 15, fontWeight: "700" },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnOutlineText: { color: C.primary, fontSize: 15, fontWeight: "600" },
  adminArea: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  adminBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.surface2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  adminBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.primary,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 12, color: C.text3, fontWeight: "500" },
  cityOption: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: C.surface2,
  },
  cityOptionActive: {
    borderColor: C.primary,
    backgroundColor: "rgba(49, 130, 206, 0.12)",
  },
  cityOptionText: {
    color: C.text,
    fontSize: 14,
    fontWeight: "600",
  },
  cityOptionTextActive: {
    color: C.primary,
  },
});
