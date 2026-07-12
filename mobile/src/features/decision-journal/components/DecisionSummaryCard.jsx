import React from "react";
import {
  StyleSheet,
  Text,
  View
} from "react-native";

export default function DecisionSummaryCard({
  symbol,
  companyName,
  reason,
  expectedOutcome,
  confidence,
  price,
  decision = "Consider Buy"
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>
        Practice Decision
      </Text>

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.symbol}>
            {symbol || "N/A"}
          </Text>

          <Text style={styles.company}>
            {companyName || "Practice Security"}
          </Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {decision}
          </Text>
        </View>
      </View>

      <Info
        label="Reason"
        value={reason}
      />

      <Info
        label="Expected Outcome"
        value={expectedOutcome}
      />

      <Info
        label="Confidence"
        value={`${Number(confidence || 0)}/5`}
      />

      <Info
        label="Reference Price"
        value={`KES ${money(price)}`}
      />

      <Text style={styles.notice}>
        This is a practice reflection. No real
        broker order has been submitted.
      </Text>
    </View>
  );
}

function Info({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text style={styles.infoValue}>
        {String(value || "Not provided")}
      </Text>
    </View>
  );
}

function money(value) {
  return Number(value || 0).toLocaleString(
    undefined,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginTop: 20
  },

  eyebrow: {
    color: "#c084fc",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 10
  },

  symbol: {
    color: "white",
    fontSize: 24,
    fontWeight: "900"
  },

  company: {
    color: "#94a3b8",
    marginTop: 4
  },

  badge: {
    backgroundColor: "rgba(6,182,212,.12)",
    borderColor: "rgba(6,182,212,.35)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7
  },

  badgeText: {
    color: "#67e8f9",
    fontSize: 11,
    fontWeight: "900"
  },

  infoRow: {
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 12
  },

  infoLabel: {
    color: "#94a3b8",
    fontSize: 12
  },

  infoValue: {
    color: "white",
    fontWeight: "800",
    marginTop: 5,
    lineHeight: 20
  },

  notice: {
    color: "#fde68a",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14
  }
});