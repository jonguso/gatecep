import React, { useCallback, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useAuth } from "../features/auth/hooks/useAuth";

import { router, useFocusEffect } from "expo-router";
import { getCurrentSession } from "../auth/authStore";
import { userGetItem } from "../auth/userStorage";
import {
  normalizeInvestorProfile
} from "../features/profile/investorProfileContract";

export default function ActiveUserBanner() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [broker, setBroker] = useState(null);

  const { user } = useAuth();

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

 async function load() {
  const currentSession =
    await getCurrentSession();

  const profileRaw =
    await userGetItem("investorProfile");

  const defaultBrokerRaw =
    await userGetItem(
      "defaultBrokerProfile"
    );

  const legacyBrokerRaw =
    await userGetItem(
      "brokerProfile"
    );

  setSession(currentSession);

  setProfile(
    profileRaw
      ? normalizeInvestorProfile(JSON.parse(profileRaw))
      : null
  );

  const brokerRaw =
    defaultBrokerRaw ||
    legacyBrokerRaw;

  setBroker(
    brokerRaw
      ? JSON.parse(brokerRaw)
      : null
  );
}

  return (
    <Pressable
      style={styles.banner}
      onPress={() => router.push("/my-profile")}
    >
      <View>
        <Text style={styles.label}>Active Account</Text>
        <Text style={styles.name}>
          👤 {user?.username || user?.email || "User"}
        </Text>
      </View>

      <View style={styles.right}>
  <Text style={styles.detail}>
    {
      profile?.risk ||
      profile?.riskTolerance ||
      profile?.riskProfile ||
      profile?.goal ||
      "Profile pending"
    }
  </Text>

  <Text style={styles.detail}>
    {broker?.broker || broker?.name || "No broker"}
  </Text>
</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginTop: 14,
    backgroundColor: "rgba(6,182,212,.10)",
    borderColor: "rgba(6,182,212,.35)",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  label: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "800"
  },
  name: {
    color: "white",
    fontWeight: "900",
    marginTop: 4
  },
  right: {
    alignItems: "flex-end",
    flex: 1
  },
  detail: {
    color: "#67e8f9",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3
  }
});
