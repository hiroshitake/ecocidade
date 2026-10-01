import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from "react-native";
import { InlineError } from "../components/InlineError";
import { useAppTheme } from "../context/theme-context";
import { S } from "../constants/theme";
import { useToast } from "../context/toast-context";
import { formatBirthDate } from "../functions/masks";
import { getCurrentUserData, signIn, signUp } from "../services/auth";
import {
    getSupabaseSessionUser,
    isSupabaseConfigured,
    signInWithSupabase,
    signUpWithSupabase,
    signInWithGoogle,
    supabase,
} from "../services/supabase";

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 800;
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase não configurado.");
      }
      await signInWithGoogle();
      if (Platform.OS !== "web") {
        await finishAuthenticatedUser();
      }
    } catch (error: any) {
      console.error("Erro no login com Google:", error);
      if (error?.message !== "O login com Google foi interrompido.") {
        toast.addToast(
          error?.message || "Não foi possível entrar com Google.",
          "error"
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const screenTranslateY = useRef(new Animated.Value(14)).current;
  const tabOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: false,
      }),
      Animated.timing(screenTranslateY, {
        toValue: 0,
        duration: 420,
        useNativeDriver: false,
      }),
    ]).start();
  }, [screenOpacity, screenTranslateY]);

  useEffect(() => {
    tabOpacity.setValue(0.65);
    Animated.timing(tabOpacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [tab, tabOpacity]);
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    password: "",
    name: "",
    birthdate: "",
    city: "",
  });
  const router = useRouter();
  const toast = useToast();
  const finishAuthenticatedUser = async () => {
    const currentUser = await getSupabaseSessionUser();
    if (!currentUser) return false;
    await AsyncStorage.setItem("ecocidade.user", JSON.stringify(currentUser));
    if (!currentUser.city_id && !currentUser.city) {
      router.replace("/google-profile");
    } else {
      router.replace("/map");
    }
    return true;
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let mounted = true;
    finishAuthenticatedUser().catch((error) =>
      console.error("Erro ao recuperar sessão:", error),
    );

    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!mounted || !session) return;
      finishAuthenticatedUser().catch((error) =>
        console.error("Erro ao finalizar autenticação:", error),
      );
    });

    return () => {
      mounted = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, []);



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
          birthdate.trim(),
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
      style={{ flex: 1, backgroundColor: "#0b1329" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          isDesktop && styles.scrollContainerDesktop,
        ]}
        bounces={false}
      >
        <View style={[styles.mainCard, isDesktop && styles.mainCardDesktop]}>
          <View style={[styles.heroPanel, isDesktop && styles.heroPanelDesktop]}>
            <ImageBackground
              source={require("../assets/images/login-map.jpg")}
              style={styles.heroBackground}
              imageStyle={{ opacity: 0.35 }}
            >
              <LinearGradient
                colors={["rgba(10, 25, 47, 0.85)", "rgba(11, 19, 41, 0.96)"]}
                style={styles.heroGradient}
              >
                <View style={styles.brandContainer}>
                  <Image
                    source={require("../assets/images/logo.png")}
                    style={styles.brandLogo}
                    resizeMode="contain"
                  />
                  <View>
                    <Text style={styles.brandTitle}>ECOcidade</Text>
                    <Text style={styles.brandSubtitle}>
                      Zeladoria &amp; Segurança Urbana
                    </Text>
                  </View>
                </View>

                <View style={styles.heroContent}>
                  <Text style={styles.heroHeading}>
                    {tab === "login" ? "Bem-vindo de volta!" : "Junte-se à sua cidade"}
                  </Text>
                  <Text style={styles.heroText}>
                    Acompanhe solicitações de zeladoria, mapas de segurança e contribua para uma cidade mais inteligente e integrada.
                  </Text>
                </View>

                {isDesktop && (
                  <View style={styles.heroFooter}>
                    <View style={styles.badgePill}>
                      <Ionicons name="shield-checkmark" size={14} color="#60a5fa" />
                      <Text style={styles.badgeText}>Plataforma Cívica Integrada</Text>
                    </View>
                  </View>
                )}
              </LinearGradient>
            </ImageBackground>
          </View>

          <View style={[styles.formPanel, isDesktop && styles.formPanelDesktop]}>
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
                  placeholderTextColor="#64748b"
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
                    placeholderTextColor="#64748b"
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
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>
                <InlineError
                  message={fieldErrors.password}
                  visible={Boolean(fieldErrors.password)}
                />

                <TouchableOpacity
                  style={styles.forgotBtn}
                  onPress={() => router.push("/forgot-password")}
                >
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
                      <Ionicons name="log-in-outline" size={20} color="white" />
                      <Text style={styles.btnText}>Acessar Conta</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ou continue com</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.btnGoogle}
                  onPress={handleGoogleLogin}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <ActivityIndicator color="#1e293b" size="small" />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={18} color="#ea4335" />
                      <Text style={styles.btnGoogleText}>Entrar com Google</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {tab === "register" && (
              <View>
                <Text style={styles.label}>NOME COMPLETO</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Seu nome"
                  placeholderTextColor="#64748b"
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
                  placeholderTextColor="#64748b"
                  value={birthdate}
                  onChangeText={(value) => {
                    setBirthdate(formatBirthDate(value));
                    if (fieldErrors.birthdate) setError("birthdate", "");
                  }}
                  keyboardType="numeric"
                  maxLength={10}
                />
                <InlineError
                  message={fieldErrors.birthdate}
                  visible={Boolean(fieldErrors.birthdate)}
                />

                <Text style={styles.label}>CIDADE</Text>
                <View style={styles.cityGrid}>
                  {cityOptions.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.cityOption,
                        selectedCity === c.id && styles.cityOptionActive,
                      ]}
                      onPress={() => {
                        setSelectedCity(c.id);
                        if (fieldErrors.city) setError("city", "");
                      }}
                    >
                      <Text
                        style={[
                          styles.cityOptionText,
                          selectedCity === c.id && styles.cityOptionTextActive,
                        ]}
                      >
                        {c.name}
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
                  placeholderTextColor="#64748b"
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
                    placeholderTextColor="#64748b"
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
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>
                <InlineError
                  message={fieldErrors.password}
                  visible={Boolean(fieldErrors.password)}
                />

                <TouchableOpacity
                  style={[styles.btnPrimary, { backgroundColor: "#15803d" }]}
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
                <Ionicons name="shield-checkmark" size={17} color="#2563eb" />
                <Text style={styles.adminBtnText}>
                  Acesso de Servidor / Gestão Pública
                </Text>
                <Ionicons name="chevron-forward" size={15} color="#2563eb" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  scrollContainerDesktop: {
    padding: 32,
    alignItems: "center",
  },
  mainCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  mainCardDesktop: {
    maxWidth: 920, width: "100%", alignSelf: "center",
    flexDirection: "row",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 12,
  },
  heroPanel: {
    minHeight: 240,
    backgroundColor: "#0b1329",
  },
  heroPanelDesktop: {
    width: "48%",
    minHeight: 620,
  },
  heroBackground: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    flex: 1,
    padding: 32,
    justifyContent: "space-between",
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  heroContent: {
    marginVertical: 24,
  },
  heroHeading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 10,
    lineHeight: 32,
  },
  heroText: {
    fontSize: 14,
    color: "#cbd5e1",
    lineHeight: 20,
  },
  heroFooter: {
    marginTop: "auto",
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "rgba(30, 58, 138, 0.45)",
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.3)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    color: "#93c5fd",
    fontWeight: "600",
  },
  formPanel: {
    padding: 24,
    backgroundColor: "#ffffff",
  },
  formPanelDesktop: {
    width: "52%",
    padding: 40,
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  tabBtnTextActive: {
    color: "#1e3a8a",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 13,
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginBottom: 20,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    color: "#2563eb",
    fontWeight: "600",
  },
  btnPrimary: {
    backgroundColor: "#1d4ed8",
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  dividerText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  btnGoogle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingVertical: 12,
  },
  btnGoogleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  cityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  cityOption: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f8fafc",
  },
  cityOptionActive: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  cityOptionText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
  },
  cityOptionTextActive: {
    color: "#1d4ed8",
  },
  adminArea: {
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  adminBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  adminBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563eb",
  },
});
