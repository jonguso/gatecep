import { useState } from "react";

import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert
} from "react-native";

import { router } from "expo-router";

import {
  saveProfile,
  loadProfile
} from "../../src/utils/onboardingStorage";

export default function Name() {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [saving, setSaving] = useState(false);

  async function next() {
    const firstName = first.trim();
    const lastName = last.trim();

    if (!firstName) {
      Alert.alert(
        "First name required",
        "Please enter your first name."
      );

      return;
    }

    try {
      setSaving(true);

      const savedProfile = await saveProfile({
        firstName,
        lastName
      });

      console.log(
        "NAME SCREEN SAVE RESULT:",
        JSON.stringify(savedProfile, null, 2)
      );

      /*
       * Read the record back immediately to confirm that
       * it was saved under the current user namespace.
       */
      const verifiedProfile = await loadProfile();

      console.log(
        "NAME SCREEN VERIFIED PROFILE:",
        JSON.stringify(verifiedProfile, null, 2)
      );

      if (!verifiedProfile?.firstName) {
        throw new Error(
          "The first name was not found after saving the profile."
        );
      }

      router.replace("/new-investor");
    } catch (error) {
      console.error(
        "Unable to save onboarding name:",
        error
      );

      Alert.alert(
        "Unable to save name",
        error?.message ||
          "GateCEP could not save your name. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>
        What should Coach G call you?
      </Text>

      <TextInput
        placeholder="First Name"
        placeholderTextColor="#94a3b8"
        style={styles.input}
        value={first}
        onChangeText={setFirst}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!saving}
        returnKeyType="next"
      />

      <TextInput
        placeholder="Last Name"
        placeholderTextColor="#94a3b8"
        style={styles.input}
        value={last}
        onChangeText={setLast}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!saving}
        returnKeyType="done"
        onSubmitEditing={next}
      />

      <Pressable
        style={[
          styles.button,
          saving && styles.buttonDisabled
        ]}
        onPress={next}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? "Saving..." : "Continue"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617",
    padding: 25,
    justifyContent: "center"
  },

  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "white",
    marginBottom: 30
  },

  input: {
    backgroundColor: "#0f172a",
    padding: 18,
    borderRadius: 18,
    marginBottom: 14,
    color: "white"
  },

  button: {
    backgroundColor: "#22d3ee",
    padding: 18,
    borderRadius: 20
  },

  buttonDisabled: {
    opacity: 0.6
  },

  buttonText: {
    textAlign: "center",
    fontWeight: "900"
  }
});