import React, { useState } from "react";
import {
  Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useAuth } from "../src/features/auth/hooks/useAuth";

export default function RegisterScreen() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim() && username.trim() && password && !loading;

  async function handleRegister() {
    if (!canSubmit) return;
    try {
      setLoading(true);
      await register({ email: email.trim(), username: username.trim(), password });
      Alert.alert("Account Created", "Let’s set up your investor profile.");
      router.replace("/onboarding/name");
    } catch (error) {
      Alert.alert("Registration Failed", error?.message || "Unable to register");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>GATECEP 5.0</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Keep your investor profile, broker links, REAL portfolio, and Coach G insights across devices.</Text>

          <View style={styles.formCard}>
            <FieldLabel>Email</FieldLabel>
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
              value={email}
              onChangeText={setEmail}
              style={styles.input}
            />

            <FieldLabel>Username</FieldLabel>
            <TextInput
              accessibilityLabel="Username"
              placeholder="Choose a username"
              placeholderTextColor="#64748b"
              selectionColor="#c084fc"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username-new"
              textContentType="username"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
            />

            <FieldLabel>Password</FieldLabel>
            <View style={styles.passwordRow}>
              <TextInput
                accessibilityLabel="Password"
                placeholder="Create a password"
                placeholderTextColor="#64748b"
                selectionColor="#c084fc"
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleRegister}
                style={styles.passwordInput}
              />
              <Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? "Hide password" : "Show password"} style={styles.showButton} onPress={() => setPasswordVisible((value) => !value)}>
                <Text style={styles.showText}>{passwordVisible ? "Hide" : "Show"}</Text>
              </Pressable>
            </View>

            <Pressable style={[styles.primary, !canSubmit && styles.disabled]} onPress={handleRegister} disabled={!canSubmit}>
              <Text style={styles.primaryText}>{loading ? "Creating account…" : "Create Account"}</Text>
            </Pressable>
          </View>

          <Pressable style={styles.secondary} onPress={() => router.replace("/login")}>
            <Text style={styles.secondaryText}>Already have an account? <Text style={styles.secondaryStrong}>Sign in</Text></Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({ children }) { return <Text style={styles.label}>{children}</Text>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#020617" },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 22, paddingVertical: 28, width: "100%", maxWidth: 520, alignSelf: "center" },
  eyebrow: { color: "#c084fc", fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  title: { color: "#f8fafc", fontSize: 30, fontWeight: "900", marginTop: 7 },
  subtitle: { color: "#94a3b8", lineHeight: 21, marginTop: 8, marginBottom: 22 },
  formCard: { backgroundColor: "#0f172a", borderColor: "#334155", borderWidth: 1, borderRadius: 20, padding: 17 },
  label: { color: "#cbd5e1", fontSize: 12, fontWeight: "800", marginBottom: 7, marginTop: 3 },
  input: { minHeight: 52, backgroundColor: "#020617", borderColor: "#475569", borderWidth: 1, color: "#f8fafc", fontSize: 16, paddingHorizontal: 14, borderRadius: 14, marginBottom: 15 },
  passwordRow: { minHeight: 52, backgroundColor: "#020617", borderColor: "#475569", borderWidth: 1, borderRadius: 14, flexDirection: "row", alignItems: "center" },
  passwordInput: { flex: 1, color: "#f8fafc", fontSize: 16, paddingHorizontal: 14, paddingVertical: 13 },
  showButton: { minWidth: 60, minHeight: 50, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  showText: { color: "#67e8f9", fontWeight: "900", fontSize: 12 },
  primary: { backgroundColor: "#9333ea", minHeight: 52, borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 20 },
  disabled: { opacity: 0.45 },
  primaryText: { color: "white", fontWeight: "900" },
  secondary: { minHeight: 50, alignItems: "center", justifyContent: "center", marginTop: 13, paddingHorizontal: 10 },
  secondaryText: { color: "#94a3b8", textAlign: "center" },
  secondaryStrong: { color: "#67e8f9", fontWeight: "900" }
});
