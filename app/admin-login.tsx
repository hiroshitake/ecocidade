import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { getCurrentUserData, signInAdmin } from "../services/auth";

export default function AdminLoginScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 800;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    password: "",
  });

  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const user = await getCurrentUserData();
        if (!mounted || !user) return;

        if (user.role === "admin") {
          router.replace("/(admin)/dashboard");
        }
      } catch (error) {
        console.error("Admin bootstrap error:", error);
      }
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [router]);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const setError = (field: keyof typeof fieldErrors, message: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  };

  const clearErrors = () => {
    setFieldErrors({
      email: "",
      password: "",
    });
  };

  const handleLogin = async () => {
    clearErrors();

    if (!email.trim()) {
      setError("email", "Informe seu e-mail institucional.");
      return;
    }

    if (!isValidEmail(email.trim())) {
      setError("email", "Informe um e-mail válido.");
      return;
    }

    if (!password.trim()) {
      setError("password", "Informe sua senha de administrador.");
      return;
    }

    setLoading(true);

    try {
      const user = await signInAdmin(email.trim().toLowerCase(), password);

      if (user.role === "admin") {
        router.replace("/(admin)/dashboard");
      } else {
        Alert.alert(
          "Acesso negado",
          "A conta autenticada não possui permissão de administrador.",
        );
        setLoading(false);
      }
    } catch (error: any) {
      console.log("Admin login error:", error?.code, error?.message);

      let msg = "Falha ao autenticar. Verifique suas credenciais e tente novamente.";
      if (typeof error?.message === "string" && error.message.trim()) {
        msg = error.message;
      }

      Alert.alert("Acesso Negado", msg);
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
          {/* Painel Hero Lateral */}
          <View style={[styles.heroPanel, isDesktop && styles.heroPanelDesktop]}>
            <ImageBackground
              source={require("../assets/images/login-map.jpg")}
              style={styles.heroBackground}
              imageStyle={{ opacity: 0.55 }}
            >
              <LinearGradient
                colors={["rgba(10, 25, 47, 0.70)", "rgba(11, 19, 41, 0.88)"]}
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
                      Painel Administrativo
                    </Text>
                  </View>
                </View>

                <View style={styles.heroContent}>
                  <Text style={styles.heroHeading}>
                    Gestão &amp; Governança Urbana
                  </Text>
                  <Text style={styles.heroText}>
                    Acesso exclusivo para servidores, secretarias municipais e equipes de fiscalização e zeladoria.
                  </Text>
                </View>

                {isDesktop && (
                  <View style={styles.heroFooter}>
                    <View style={styles.badgePill}>
                      <Ionicons name="shield-checkmark" size={14} color="#60a5fa" />
                      <Text style={styles.badgeText}>Portal Governamental Seguro</Text>
                    </View>
                  </View>
                )}
              </LinearGradient>
            </ImageBackground>
          </View>

          {/* Painel do Formulário */}
          <View style={[styles.formPanel, isDesktop && styles.formPanelDesktop]}>
            <View style={styles.headerInfo}>
              <View style={styles.roleTag}>
                <Ionicons name="lock-closed" size={14} color="#1d4ed8" />
                <Text style={styles.roleTagText}>ACESSO RESTRITO</Text>
              </View>
              <Text style={styles.title}>Entrar no Dashboard</Text>
              <Text style={styles.subtitle}>
                Utilize suas credenciais institucionais autorizadas
              </Text>
            </View>

            {/* Campo E-mail */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>E-MAIL INSTITUCIONAL</Text>
              <TextInput
                style={[styles.input, fieldErrors.email ? styles.inputError : null]}
                placeholder="admin@prefeitura.gov.br"
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
              <InlineError message={fieldErrors.email} />
            </View>

            {/* Campo Senha */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>SENHA</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    { paddingRight: 45, marginBottom: 0 },
                    fieldErrors.password ? styles.inputError : null,
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor="#64748b"
                  secureTextEntry={!showPass}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPass(!showPass)}
                  accessibilityRole="button"
                  accessibilityLabel={showPass ? "Ocultar senha" : "Exibir senha"}
                >
                  <Ionicons
                    name={showPass ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>
              <InlineError message={fieldErrors.password} />
            </View>

            {/* Link Esqueci a senha */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => router.push("/forgot-password")}
            >
              <Text style={styles.forgotText}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            {/* Botão de Entrar */}
            <TouchableOpacity
              style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={18} color="#ffffff" />
                  <Text style={styles.btnText}>Acessar Painel</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Separador e Botão Voltar */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OU</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => router.replace("/login")}
              disabled={loading}
            >
              <Ionicons name="arrow-back-outline" size={16} color="#334155" />
              <Text style={styles.btnSecondaryText}>
                Voltar ao login de usuários
              </Text>
            </TouchableOpacity>

            {/* Rodapé Informativo */}
            <View style={styles.footerNote}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#64748b" />
              <Text style={styles.footerNoteText}>
                Conexão criptografada ponta a ponta para gestão pública municipal.
              </Text>
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
    maxWidth: 920,
    width: "100%",
    alignSelf: "center",
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
  headerInfo: {
    marginBottom: 24,
  },
  roleTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1d4ed8",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  fieldContainer: {
    marginBottom: 16,
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
  },
  inputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  passwordWrapper: {
    position: "relative",
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 13,
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginBottom: 20,
    marginTop: 2,
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
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingVertical: 11,
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  footerNoteText: {
    flex: 1,
    fontSize: 12,
    color: "#64748b",
    lineHeight: 16,
  },
});
