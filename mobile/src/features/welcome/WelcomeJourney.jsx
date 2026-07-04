import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { useWelcomeJourney } from "./hooks/useWelcomeJourney";
import CoachBubble from "./components/CoachBubble";
import OptionCard from "./components/OptionCard";
import ProgressHeader from "./components/ProgressHeader";

const moments = [
  {
    field: "goal",
    coach:
      "Imagine we meet again five years from today. What would make you happiest?",
    options: [
      ["home", "🏡", "I own my own home."],
      ["family", "👨‍👩‍👧", "My family is financially secure."],
      ["retirement", "🌴", "I'm preparing for retirement."],
      ["growth", "📈", "My money is growing."],
      ["exploring", "🌱", "I'm still discovering what's possible."]
    ]
  },
  {
    field: "timeHorizon",
    coach:
      "Thanks. That gives me a good starting point. When do you think you'll need this money the most?",
    options: [
      ["soon", "⏳", "Soon"],
      ["few_years", "🛤️", "In a few years"],
      ["later", "🌅", "Much later"],
      ["unsure", "🤔", "I'm still figuring that out"]
    ]
  },
  {
    field: "marketDrop",
    coach:
      "Markets sometimes have difficult seasons. If your investments lost value for a while, which response feels most like you?",
    options: [
      ["calm", "😊", "I'd stay patient."],
      ["wait", "🤔", "I'd probably wait."],
      ["guidance", "💬", "I'd want guidance."],
      ["worried", "😟", "I'd feel uncomfortable."]
    ]
  },
  {
    field: "experience",
    coach: "Everyone starts somewhere. Which best describes your investing journey today?",
    options: [
      ["first_step", "🌱", "This is my first step."],
      ["learning", "📚", "I've been learning."],
      ["invested_before", "📈", "I've invested before."],
      ["comfortable", "🎯", "I'm comfortable investing."]
    ]
  },
  {
    field: "contribution",
    coach: "How would you like us to build your future together?",
    options: [
      ["monthly", "📅", "Every month"],
      ["flexible", "🤝", "Whenever I can"],
      ["quarterly", "🗓️", "Every few months"],
      ["one_time", "🌟", "One investment to start"]
    ]
  }
];

export default function WelcomeJourney() {
  const journey = useWelcomeJourney();
  const {
    step,
    answers,
    result,
    loading,
    updateAnswer,
    updateAmount,
    goBack,
    completeJourney,
    goToStarterPlan,
    goToDashboard
  } = journey;

  async function handleComplete() {
    try {
      await completeJourney();
    } catch (error) {
      Alert.alert("Coach G", error.message || "Unable to build your Wealth Blueprint.");
    }
  }

  if (result) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your Investor DNA</Text>

        <CoachBubble>
          Here's what I understand so far. This is not fixed — as we continue together,
          your Wealth Blueprint will become more personal.
        </CoachBubble>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Meet your Investor DNA</Text>
          <Info label="Investor Type" value={result.profile.investorType} />
          <Info label="Comfort Profile" value={result.profile.risk} />
          <Info label="Starting Amount" value={`KES ${money(result.profile.amount)}`} />
          <Info label="Review Rhythm" value={result.starterPlan.reviewFrequency} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Wealth Blueprint</Text>
          <Info
            label="Estimated Invested"
            value={`KES ${money(result.starterPlan.totalInvested)}`}
          />
          <Info
            label="Cash Reserve"
            value={`KES ${money(result.starterPlan.cashReserve)}`}
          />

          <Text style={styles.body}>Suggested practice allocation:</Text>

          {result.starterPlan.allocations.map((item) => (
            <View key={item.name} style={styles.allocationRow}>
              <Text style={styles.allocationName}>{item.name}</Text>
              <Text style={styles.allocationValue}>
                {item.weight}% • KES {money(item.amount)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.demoCard}>
          <Text style={styles.cardTitle}>Practice Investing First</Text>
          <Text style={styles.body}>
            Before investing real money, Coach G will help you practice, learn, and
            understand each decision. We advise. You decide.
          </Text>
        </View>

        <Pressable style={styles.primary} onPress={goToStarterPlan}>
          <Text style={styles.primaryText}>Build My Practice Portfolio</Text>
        </Pressable>

        <Pressable style={styles.secondary} onPress={goToDashboard}>
          <Text style={styles.secondaryText}>Continue with Coach G</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" />
        <Text style={styles.titleCenter}>Give me a moment...</Text>
        <Text style={styles.subtitleCenter}>
          I'm putting everything together and building your first Wealth Blueprint.
        </Text>
      </View>
    );
  }

  if (step === 0) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Meet Coach G</Text>

        <CoachBubble>
          Hi, I'm Coach G. Before we talk about investing, I'd love to get to know
          you a little better. There are no right or wrong answers.
        </CoachBubble>

        <Text style={styles.subtitle}>
          This will only take a few minutes. My goal is to understand what matters to you
          before building your first Wealth Blueprint.
        </Text>

        <Pressable style={styles.primary} onPress={() => updateAnswer("_intro", true)}>
          <Text style={styles.primaryText}>Let's Begin</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const momentIndex = step - 1;
  const current = moments[momentIndex];

  if (current) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Getting to Know You</Text>
        <ProgressHeader step={momentIndex} />

        <CoachBubble>{current.coach}</CoachBubble>

        <View style={styles.options}>
          {current.options.map(([value, icon, title]) => (
            <OptionCard
              key={value}
              icon={icon}
              title={title}
              onPress={() => updateAnswer(current.field, value)}
            />
          ))}
        </View>

        {step > 1 ? (
          <Pressable style={styles.secondary} onPress={goBack}>
            <Text style={styles.secondaryText}>Back</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Almost Ready</Text>

      <CoachBubble>
        One last thing. How much would you like to use for your first practice plan?
      </CoachBubble>

      <TextInput
        value={answers.amount}
        onChangeText={updateAmount}
        keyboardType="numeric"
        placeholder="Starting Amount"
        placeholderTextColor="#64748b"
        style={styles.input}
      />

      <View style={styles.quickAmounts}>
        {["10000", "50000", "100000"].map((value) => (
          <Pressable
            key={value}
            style={styles.quickAmount}
            onPress={() => updateAmount(value)}
          >
            <Text style={styles.quickAmountText}>
              KES {Number(value).toLocaleString()}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.primary} onPress={handleComplete}>
        <Text style={styles.primaryText}>Build My Wealth Blueprint</Text>
      </Pressable>

      <Pressable style={styles.secondary} onPress={goBack}>
        <Text style={styles.secondaryText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

function Info({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{String(value || "N/A")}</Text>
    </View>
  );
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 100 },
  centerScreen: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    padding: 24
  },
  title: { color: "white", fontSize: 32, fontWeight: "900" },
  titleCenter: {
    color: "white",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 20,
    textAlign: "center"
  },
  subtitle: { color: "#94a3b8", marginTop: 18, lineHeight: 22 },
  subtitleCenter: {
    color: "#94a3b8",
    marginTop: 12,
    lineHeight: 22,
    textAlign: "center"
  },
  options: { marginTop: 22 },
  card: {
    marginTop: 22,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  demoCard: {
    marginTop: 22,
    backgroundColor: "rgba(147,51,234,.12)",
    borderColor: "rgba(147,51,234,.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  cardTitle: {
    color: "#67e8f9",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12
  },
  body: { color: "#cbd5e1", marginTop: 10, lineHeight: 22 },
  input: {
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    color: "white",
    marginTop: 18
  },
  quickAmounts: { flexDirection: "row", gap: 8, marginTop: 14 },
  quickAmount: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 11
  },
  quickAmountText: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center"
  },
  allocationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 12,
    gap: 10
  },
  allocationName: { color: "#cbd5e1", flex: 1 },
  allocationValue: { color: "white", fontWeight: "900", textAlign: "right" },
  infoRow: {
    paddingVertical: 10,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1
  },
  infoLabel: { color: "#94a3b8", fontSize: 12 },
  infoValue: {
    color: "white",
    fontWeight: "900",
    marginTop: 4,
    textTransform: "capitalize"
  },
  primary: {
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18,
    marginTop: 24
  },
  primaryText: { color: "white", textAlign: "center", fontWeight: "900" },
  secondary: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 18,
    marginTop: 14
  },
  secondaryText: { color: "#67e8f9", textAlign: "center", fontWeight: "900" }
});