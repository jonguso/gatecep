import React, { useCallback, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { loadFundamentalRecord } from "../../src/features/fundamentals/fundamentalRepository";
import {
  buildSecurityEducationModel,
  explainMetric
} from "../../src/services/markets/securityEducationService";
import useMarketData from "../../src/services/markets/useMarketData";

export default function CompanyDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();

  const targetSymbol = String(params?.symbol || "")
    .trim()
    .toUpperCase();

  const wideWeb = Platform.OS === "web" && width >= 1100;

  const { rows, loading: marketLoading } = useMarketData();

  const [fundamentals, setFundamentals] = useState(null);
  const [fundamentalsLoading, setFundamentalsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadCompanyDetails() {
        setFundamentalsLoading(true);

        try {
          const fundamentalRecord =
            await loadFundamentalRecord(targetSymbol);

          if (!active) return;

          setFundamentals(fundamentalRecord || null);
        } catch (error) {
          if (!active) return;

          console.warn(
            "Unable to load company details:",
            error?.message || error
          );

          setFundamentals(null);
        } finally {
          if (active) setFundamentalsLoading(false);
        }
      }

      loadCompanyDetails();

      return () => {
        active = false;
      };
    }, [targetSymbol])
  );

  const security = useMemo(() => {
    return rows.find(
      (item) =>
        String(item?.symbol || "")
          .trim()
          .toUpperCase() === targetSymbol
    ) || null;
  }, [rows, targetSymbol]);

  const securityContext =
    security || {
      symbol: targetSymbol,
      name: fundamentals?.companyName || targetSymbol,
      sector: fundamentals?.sector || "NSE"
    };

  const education = useMemo(
    () =>
      buildSecurityEducationModel(
        securityContext,
        fundamentals
      ),
    [security, fundamentals, targetSymbol]
  );

  const loading = marketLoading || fundamentalsLoading;
  const fiscalPeriod = formatFiscalPeriod(education.fiscalPeriod);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          wideWeb && styles.contentWide
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>

          <View style={styles.headerIdentity}>
            <Text style={styles.eyebrow}>COMPANY DETAILS</Text>
            <Text style={styles.title}>
              {securityContext?.name || targetSymbol}
            </Text>
            <Text style={styles.subtitle}>
              {targetSymbol || "N/A"} |{" "}
              {education.profile.sector ||
                securityContext?.sector ||
                "NSE"}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.card}>
            <Text style={styles.body}>
              Loading approved company fundamentals...
            </Text>
          </View>
        ) : education.evidence.available ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Understand the company
              </Text>

              <Text style={styles.body}>
                {education.profile.description ||
                  "A verified company description has not been imported yet."}
              </Text>

              <MetricLine
                label="Sector"
                value={education.profile.sector || "N/A"}
              />
              <MetricLine
                label="Industry"
                value={education.profile.industry || "N/A"}
              />
              <MetricLine
                label="Fiscal period"
                value={fiscalPeriod}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Valuation</Text>

              <EducationMetric
                label="Market capitalisation"
                value={largeMoney(education.fields.marketCap)}
              />
              <EducationMetric
                label="P/E"
                value={ratio(education.fields.pe)}
                help={explainMetric("pe")}
              />
              <EducationMetric
                label="P/B"
                value={ratio(education.fields.pb)}
                help={explainMetric("pb")}
              />
              <EducationMetric
                label="BVPS"
                value={kes(education.fields.bookValuePerShare)}
                help={explainMetric("bookValuePerShare")}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Profitability</Text>

              <EducationMetric
                label="EPS"
                value={kes(education.fields.eps)}
                help={explainMetric("eps")}
              />
              <EducationMetric
                label="ROE"
                value={percent(education.fields.returnOnEquity)}
                help={explainMetric("returnOnEquity")}
              />
              <EducationMetric
                label="Net income"
                value={largeMoney(education.fields.netIncome)}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Income & shareholder return
              </Text>

              <EducationMetric
                label="DPS"
                value={kes(education.fields.dps)}
              />
              <EducationMetric
                label="Dividend yield"
                value={percent(education.fields.dividendYield)}
                help={explainMetric("dividendYield")}
              />

              <Text style={styles.lesson}>
                Dividends are not guaranteed. Confirm declaration,
                book-closure, ex-dividend and payment dates before
                relying on expected income.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Financial position
              </Text>

              <EducationMetric
                label="Total assets"
                value={largeMoney(education.fields.assets)}
              />
              <EducationMetric
                label="Total liabilities"
                value={largeMoney(education.fields.liabilities)}
              />
              <EducationMetric
                label="Shareholders equity"
                value={largeMoney(education.fields.equity)}
              />
            </View>
          </>
        ) : (
          <View style={styles.missingCard}>
            <Text style={styles.cardTitle}>
              Fundamentals not yet available
            </Text>

            <Text style={styles.body}>
              Verified fundamental evidence is not available for this
              security yet. GateCEP will show these measures when
              approved issuer evidence becomes available.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MetricLine({ label, value }) {
  return (
    <View style={styles.metricLine}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function EducationMetric({ label, value, help }) {
  return (
    <View style={styles.educationMetric}>
      <MetricLine label={label} value={value} />
      {help ? <Text style={styles.help}>{help}</Text> : null}
    </View>
  );
}

function formatFiscalPeriod(value) {
  if (!value) return "N/A";

  const text = String(value).trim();

  const yearMatch = text.match(/^(\d{4})-\d{2}-\d{2}/);
  if (yearMatch) return `FY${yearMatch[1]}`;

  const fyMatch = text.match(/FY\s*(\d{4})/i);
  if (fyMatch) return `FY${fyMatch[1]}`;

  return text;
}

function finite(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function kes(value) {
  const amount = finite(value);
  return amount === null
    ? "N/A"
    : `KES ${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
}

function ratio(value) {
  const amount = finite(value);
  return amount === null ? "N/A" : `${amount.toFixed(2)}x`;
}

function percent(value) {
  const amount = finite(value);
  return amount === null ? "N/A" : `${amount.toFixed(2)}%`;
}

function largeMoney(value) {
  const amount = finite(value);

  if (amount === null) return "N/A";

  if (Math.abs(amount) >= 1_000_000_000) {
    return `KES ${(amount / 1_000_000_000).toFixed(2)}B`;
  }

  if (Math.abs(amount) >= 1_000_000) {
    return `KES ${(amount / 1_000_000).toFixed(2)}M`;
  }

  return kes(amount);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#08101f"
  },

  scroll: {
    flex: 1
  },

  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 16
  },

  contentWide: {
    width: "100%",
    maxWidth: 1080,
    alignSelf: "center",
    paddingHorizontal: 24
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14
  },

  backButton: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10
  },

  backButtonText: {
    color: "#e2e8f0",
    fontWeight: "700"
  },

  headerIdentity: {
    flex: 1
  },

  eyebrow: {
    color: "#22d3ee",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1
  },

  title: {
    color: "#f8fafc",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 4
  },

  subtitle: {
    color: "#94a3b8",
    marginTop: 4
  },

  card: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#25324a",
    borderRadius: 18,
    padding: 18
  },

  missingCard: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 18,
    padding: 18
  },

  cardTitle: {
    color: "#67e8f9",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12
  },

  body: {
    color: "#e2e8f0",
    lineHeight: 21,
    marginBottom: 8
  },

  metricLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#243047",
    paddingVertical: 12
  },

  metricLabel: {
    color: "#94a3b8",
    flex: 1
  },

  metricValue: {
    color: "#f8fafc",
    fontWeight: "800",
    textAlign: "right"
  },

  educationMetric: {
    width: "100%"
  },

  help: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 18,
    paddingTop: 4,
    paddingBottom: 8
  },

  lesson: {
    color: "#cbd5e1",
    lineHeight: 20,
    paddingTop: 12
  }
});
