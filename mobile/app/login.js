import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useAuth } from "../src/features/auth/hooks/useAuth";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  async function handleLogin() {
    if (!canSubmit) return;

    try {
      setLoading(true);
      await login({ email: email.trim(), password });
      router.replace("/");
    } catch (error) {
      Alert.alert("Login Failed", error?.message || "Unable to login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandMark}><Text style={styles.brandLetter}>G</Text></View>
          <Text style={styles.eyebrow}>GATECEP 5.0</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your REAL portfolio, broker evidence, and Coach G journey.</Text>

          <View style={styles.formCard}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              accessibilityLabel="Email"
              placeholder="name@example.com"
              placeholderTextColor="#64748b"
              selectionColor="#c084fc"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              returnKeyType="next"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                accessibilityLabel="Password"
                placeholder="Enter your password"
                placeholderTextColor="#64748b"
                selectionColor="#c084fc"
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="done"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleLogin}
                style={styles.passwordInput}
              />
              <Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? "Hide password" : "Show password"} style={styles.showButton} onPress={() => setPasswordVisible((value) => !value)}>
                <Text style={styles.showText}>{passwordVisible ? "Hide" : "Show"}</Text>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              style={[styles.primary, !canSubmit && styles.disabled]}
              onPress={handleLogin}
              disabled={!canSubmit}
            >
              <Text style={styles.primaryText}>{loading ? "Signing in…" : "Sign In"}</Text>
            </Pressable>
          </View>

          <Pressable style={styles.secondary} onPress={() => router.push("/register")}>
            <Text style={styles.secondaryText}>New to GateCEP? <Text style={styles.secondaryStrong}>Create an account</Text></Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#020617" },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 22, paddingVertical: 28, width: "100%", maxWidth: 520, alignSelf: "center" },
  brandMark: { width: 52, height: 52, borderRadius: 17, backgroundColor: "#9333ea", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  brandLetter: { color: "white", fontSize: 27, fontWeight: "900" },
  eyebrow: { color: "#c084fc", fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  title: { color: "#f8fafc", fontSize: 31, fontWeight: "900", marginTop: 7 },
  subtitle: { color: "#94a3b8", fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 22 },
  formCard: { backgroundColor: "#0f172a", borderColor: "#334155", borderWidth: 1, borderRadius: 20, padding: 17 },
  label: { color: "#cbd5e1", fontSize: 12, fontWeight: "800", marginBottom: 7, marginTop: 3 },
  input: { minHeight: 52, backgroundColor: "#020617", borderColor: "#475569", borderWidth: 1, color: "#f8fafc", fontSize: 16, paddingHorizontal: 14, borderRadius: 14, marginBottom: 15 },
  passwordRow: { minHeight: 52, backgroundColor: "#020617", borderColor: "#475569", borderWidth: 1, borderRadius: 14, flexDirection: "row", alignItems: "center" },
  passwordInput: { flex: 1, color: "#f8fafc", fontSize: 16, paddingHorizontal: 14, paddingVertical: 13 },
  showButton: { minWidth: 60, minHeight: 50, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  showText: { color: "#67e8f9", fontWeight: "900", fontSize: 12 },
  primary: { backgroundColor: "#9333ea", minHeight: 52, borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 20 },
  disabled: { opacity: 0.45 },
  primaryText: { color: "white", fontSize: 15, fontWeight: "900" },
  secondary: { minHeight: 50, alignItems: "center", justifyContent: "center", marginTop: 13, paddingHorizontal: 10 },
  secondaryText: { color: "#94a3b8", textAlign: "center" },
  secondaryStrong: { color: "#67e8f9", fontWeight: "900" }
});
