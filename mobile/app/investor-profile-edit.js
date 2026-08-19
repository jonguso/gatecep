import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router } from "expo-router";

import { useAuth } from "../src/features/auth/hooks/useAuth";
import {
  getInvestorProfile,
  saveInvestorProfile
} from "../src/features/profile/api/investorProfileApi";
import {
  userGetItem,
  userSetItem
} from "../src/auth/userStorage";
import {
  mergeInvestorProfileStorage,
  mergeProfileSources,
  normalizeInvestorProfile
} from "../src/features/profile/investorProfileContract";

const GOALS = ["Build Wealth", "Family Security", "Home Purchase", "Dividend Income", "Retirement", "Education", "Preserve Capital", "Need Guidance"];
const RISKS = ["Conservative", "Balanced", "Growth", "Aggressive"];
const EXPERIENCE = ["Beginner", "Intermediate", "Advanced"];
const TIME_HORIZONS = ["Under 1 Year", "1-3 Years", "3-5 Years", "5+ Years"];
const CONTRIBUTIONS = ["One Time", "Monthly", "Quarterly", "Flexible"];
const MARKET_DROP = ["Sell", "Wait", "Buy More", "Unsure"];

export default function InvestorProfileEdit() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("Build Wealth");
  const [risk, setRisk] = useState("Balanced");
  const [experience, setExperience] = useState("Beginner");
  const [timeHorizon, setTimeHorizon] = useState("3-5 Years");
  const [contribution, setContribution] = useState("Monthly");
  const [marketDrop, setMarketDrop] = useState("Wait");
  const [amount, setAmount] = useState("10000");
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const localRaw = await userGetItem("investorProfile");
      const local = localRaw ? JSON.parse(localRaw) : {};
      const data = await getInvestorProfile().catch(() => null);
      const cloud =
        data?.profile ||
        data?.investorProfile ||
        data ||
        {};
      const saved = mergeProfileSources(cloud, local);
      const constraints = saved.constraints || {};

      setName(
        saved.name ||
        constraints.name ||
        user?.firstName ||
        user?.username ||
        user?.email?.split("@")[0] ||
        ""
      );
      setGoal(saved.goal || "Build Wealth");
      setRisk(saved.risk || "Balanced");
      setExperience(saved.experience || "Beginner");
      setTimeHorizon(saved.timeHorizon || saved.time_horizon || "3-5 Years");
      setContribution(saved.contribution || "Monthly");
      setMarketDrop(saved.marketDrop || constraints.marketDrop || "Wait");
      setAmount(String(saved.amount || constraints.amount || "10000"));
    } catch (error) {
      console.log("Investor profile load error:", error.message);
    }
  }

  async function save() {
    try {
      setSaving(true);
      setSaveStatus("Saving profile...");

      const investorType =
        goal === "Dividend Income"
          ? "Income Builder"
          : goal === "Retirement"
          ? "Long-Term Builder"
          : risk === "Aggressive"
          ? "Growth Seeker"
          : "Balanced Builder";

      const normalizedAmount = Number(amount);

      const profile = {
        name: name.trim(),
        goal,
        risk,
        experience,
        timeHorizon,
        contribution,
        investorType,
        marketDrop,
        amount: Number.isFinite(normalizedAmount)
          ? normalizedAmount
          : 0,
        constraints: {
          name: name.trim(),
          marketDrop,
          amount: Number.isFinite(normalizedAmount)
            ? normalizedAmount
            : 0
        }
      };

      const existingRaw = await userGetItem("investorProfile");
      const existing = existingRaw ? JSON.parse(existingRaw) : {};
      const locallySaved = mergeInvestorProfileStorage(existing, profile);

      await userSetItem(
        "investorProfile",
        JSON.stringify(locallySaved)
      );

      setSaveStatus("Profile saved. Cloud sync continues in the background.");

      saveInvestorProfile(profile)
        .then(async (result) => {
          const cloudProfile = normalizeInvestorProfile(
            result?.profile || result?.investorProfile || {}
          );
          const synced = mergeInvestorProfileStorage(
            locallySaved,
            {
              ...profile,
              ...cloudProfile,
              name: cloudProfile.name || profile.name,
              goal: cloudProfile.goal || profile.goal,
              risk: cloudProfile.risk || profile.risk,
              experience: cloudProfile.experience || profile.experience,
              timeHorizon: cloudProfile.timeHorizon || profile.timeHorizon,
              contribution: cloudProfile.contribution || profile.contribution,
              marketDrop: cloudProfile.marketDrop || profile.marketDrop,
              amount: cloudProfile.amount || profile.amount
            }
          );
          await userSetItem("investorProfile", JSON.stringify(synced));
        })
        .catch((error) => {
          console.log("Investor profile cloud sync deferred:", error.message);
        });

      router.replace("/my-profile");
    } catch (error) {
      Alert.alert("Save Failed", error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Edit Investor Profile</Text>

      <Text style={styles.subtitle}>
        Update your investor profile, onboarding answers, risk profile, and goals.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#64748b"
          style={styles.input}
        />

        {saveStatus ? (
          <Text style={styles.saveStatus}>{saveStatus}</Text>
        ) : null}

        <PickerGroup title="Goal" items={GOALS} value={goal} onChange={setGoal} />
        <PickerGroup title="Risk" items={RISKS} value={risk} onChange={setRisk} />
        <PickerGroup title="Experience" items={EXPERIENCE} value={experience} onChange={setExperience} />
        <PickerGroup title="Time Horizon" items={TIME_HORIZONS} value={timeHorizon} onChange={setTimeHorizon} />
        <PickerGroup title="Contribution" items={CONTRIBUTIONS} value={contribution} onChange={setContribution} />
        <PickerGroup title="If Market Drops" items={MARKET_DROP} value={marketDrop} onChange={setMarketDrop} />

        <Text style={styles.label}>
          {contribution === "Monthly"
            ? "Monthly Contribution Amount"
            : contribution === "Quarterly"
              ? "Quarterly Contribution Amount"
              : "Contribution Amount"}
        </Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="10000"
          placeholderTextColor="#64748b"
          keyboardType="numeric"
          style={styles.input}
        />

        <Pressable
          style={[styles.primary, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
        >
          <Text style={styles.primaryText}>
            {saving ? "Saving..." : "Save Investor Profile"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.secondary}
          onPress={() => router.replace("/my-profile")}
        >
          <Text style={styles.secondaryText}>Cancel</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function PickerGroup({ title, items, value, onChange }) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{title}</Text>

      <View style={styles.chipRow}>
        {items.map((item) => (
          <Pressable
            key={item}
            style={[styles.chip, value === item && styles.chipActive]}
            onPress={() => onChange(item)}
          >
            <Text style={value === item ? styles.chipTextActive : styles.chipText}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 120 },
  title: { color: "white", fontSize: 32, fontWeight: "900" },
  subtitle: { color: "#94a3b8", marginTop: 8, lineHeight: 22 },
  card: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  label: { color: "#94a3b8", fontSize: 12, marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    color: "white"
  },
  group: { marginTop: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14
  },
  chipActive: { backgroundColor: "#9333ea", borderColor: "#c084fc" },
  chipText: { color: "#94a3b8", fontWeight: "900" },
  chipTextActive: { color: "white", fontWeight: "900" },
  primary: {
    marginTop: 22,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  primaryText: { color: "white", fontWeight: "900", textAlign: "center" },
  secondary: {
    marginTop: 12,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 16
  },
  secondaryText: { color: "#67e8f9", fontWeight: "900", textAlign: "center" },
  saveStatus: { color: "#67e8f9", marginTop: 14, fontWeight: "800" }
});
