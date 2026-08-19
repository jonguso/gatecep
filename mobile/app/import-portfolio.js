import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as XLSX from "xlsx";

import { applySecurityMaster } from "../src/utils/nseSecurityMaster";
import { userSetItem } from "../src/auth/userStorage";
import { buildSyncStatus } from "../src/portfolio/syncStatus";
import {
  loadVerifiedUserCds,
  requireValidBrokerEvidenceIdentity
} from "../src/features/broker-sync/brokerEvidenceIdentityService";
import { saveCdsProfile } from "../src/services/brokers/brokerAccountStore";

export default function ImportPortfolio() {
  const params = useLocalSearchParams();
  const reconciliationMode =
    String(params?.mode || "").toUpperCase() === "RECONCILE";
  const [status, setStatus] = useState("");
  const [brokerId, setBrokerId] = useState("AIB");
  const [tradingAccount, setTradingAccount] = useState("");
  const [cdsNumber, setCdsNumber] = useState("");
  const [storedCdsNumber, setStoredCdsNumber] = useState(null);

  useEffect(() => {
    loadVerifiedUserCds().then((value) => {
      if (value) {
        setCdsNumber(value);
        setStoredCdsNumber(value);
      }
    }).catch(() => {});
  }, []);

  async function pickFile() {
    try {
      setStatus("Selecting file...");
      
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: [
          "text/csv",
          "application/csv",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ]
      });

      if (result.canceled) {
        setStatus("");
        return;
      }

      const file = result.assets?.[0];

      if (!file) {
        throw new Error("No file selected.");
      }

      setStatus(`Reading ${file.name}...`);

      let accountIdentity = null;
      if (reconciliationMode) {
        const enteredCds = String(cdsNumber || "").trim();
        const savedCds = storedCdsNumber || await loadVerifiedUserCds();
        if (savedCds && enteredCds && savedCds !== enteredCds) {
          throw new Error("The entered CDS does not match this GateCEP user's verified CDS.");
        }
        accountIdentity = requireValidBrokerEvidenceIdentity({
          fileName: file.name,
          userCds: savedCds || enteredCds,
          brokerId,
          clientAccount: tradingAccount
        });
        if (!savedCds) {
          await saveCdsProfile({
            cdsNumber: accountIdentity.cdsNumber,
            source: "VERIFIED_BROKER_FILENAME"
          });
          setStoredCdsNumber(accountIdentity.cdsNumber);
        }
      }

      await userSetItem(
        "pendingPortfolioImport",
        JSON.stringify({
          fileName: file.name,
          uri: file.uri,
          uploadedAt: new Date().toISOString(),
          importMode: reconciliationMode
            ? "BROKER_RECONCILIATION_EVIDENCE"
            : "INITIAL_REAL_PORTFOLIO",
          accountIdentity
        })
      );

      const rows = await parsePortfolioFile(file);
      const draftRows = rows.map(normalizeHolding).filter(Boolean);

      if (!draftRows.length) {
        throw new Error(
          `No valuation rows detected. Columns found: ${Object.keys(
            rows[0] || {}
          ).join(", ")}`
        );
      }

      await userSetItem("importedPortfolioDraft", JSON.stringify(draftRows));
      if (!reconciliationMode) {
        await userSetItem("statementUploaded", "true");
      }

      await userSetItem(
        "statementSummary",
        JSON.stringify({
          count: draftRows.length,
          fileName: file.name,
          source: reconciliationMode
            ? "BROKER_RECONCILIATION_EVIDENCE"
            : "PORTFOLIO_VALUATION_UPLOAD",
          uploadedAt: new Date().toISOString()
        })
      );

      await buildSyncStatus();

      setStatus(
        `${file.name} extracted. ${draftRows.length} holdings ready for review.`
      );

      router.push({
        pathname: "/review-portfolio-import",
        params: {
          mode: reconciliationMode ? "RECONCILE" : "INITIAL"
        }
      });
    } catch (error) {
      setStatus(`Import failed: ${error.message}`);
      Alert.alert("Import failed", error.message);
    }
  }

  async function parsePortfolioFile(file) {
    const name = String(file.name || "").toLowerCase();

    if (name.endsWith(".csv")) {
      const text = await readFileText(file);
      const workbook = XLSX.read(text, { type: "string" });
      return extractRows(workbook);
    }

    const base64 = await readFileBase64(file);
    const workbook = XLSX.read(base64, { type: "base64" });
    return extractRows(workbook);
  }

  function extractRows(workbook) {
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const matrix = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      blankrows: false
    });

    const headerIndex = findHeaderRowIndex(matrix);

    if (headerIndex < 0) {
      return XLSX.utils.sheet_to_json(sheet, { defval: "" });
    }

    const headers = matrix[headerIndex].map((item) => String(item || "").trim());

    return matrix
      .slice(headerIndex + 1)
      .map((row) => {
        const obj = {};

        headers.forEach((header, index) => {
          if (header) {
            obj[header] = row[index] ?? "";
          }
        });

        return obj;
      })
      .filter((row) => {
        const values = Object.values(row).map((v) => String(v || "").trim());
        return values.some(Boolean);
      });
  }

  function findHeaderRowIndex(matrix = []) {
    const requiredHints = [
      "symbol",
      "security",
      "counter",
      "quantity",
      "qty",
      "shares",
      "units",
      "balance",
      "marketvalue",
      "valuation",
      "value"
    ];

    for (let i = 0; i < Math.min(matrix.length, 25); i += 1) {
      const normalized = matrix[i].map(normalizeKey).join("|");

      const matches = requiredHints.filter((hint) =>
        normalized.includes(hint)
      ).length;

      if (matches >= 2) {
        return i;
      }
    }

    return -1;
  }

  async function readFileText(file) {
  if (Platform.OS === "web") {
    if (file.file && typeof file.file.text === "function") {
      return await file.file.text();
    }

    const response = await fetch(file.uri);
    return await response.text();
  }

  return await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.UTF8
  });
}

  async function readFileBase64(file) {
  if (Platform.OS === "web") {
    let arrayBuffer;

    if (file.file && typeof file.file.arrayBuffer === "function") {
      arrayBuffer = await file.file.arrayBuffer();
    } else {
      const response = await fetch(file.uri);
      arrayBuffer = await response.arrayBuffer();
    }

    let binary = "";
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 8192;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
  }

  return await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.Base64
  });
}

  function normalizeHolding(row) {
    const symbol = findValue(row, [
      "Symbol",
      "Security",
      "Security Code",
      "Counter",
      "Code",
      "Ticker",
      "Share",
      "Share Code",
      "Stock",
      "Instrument",
      "Security Name"
    ]);

    const name = findValue(row, [
      "Name",
      "Security Name",
      "Company",
      "Company Name",
      "Description",
      "Instrument Name"
    ]);

    const sector = findValue(row, [
      "Sector",
      "Industry",
      "Category",
      "Segment"
    ]);

    const quantity = cleanNumber(
      findValue(row, [
        "Quantity",
        "Qty",
        "Shares",
        "Units",
        "Balance",
        "Free Balance",
        "Total Balance",
        "Available Balance",
        "Holding",
        "Holdings",
        "Qty Held",
        "No. of Shares",
        "Number of Shares"
      ])
    );

    const averagePrice = cleanNumber(
      findValue(row, [
        "Average Price",
        "Avg Price",
        "Avg.Price",
        "Weighted Average Price",
        "WAP",
        "Cost Price",
        "Book Price",
        "Purchase Price",
        "Buying Price",
        "Avg Cost"
      ])
    );

    const marketPrice = cleanNumber(
      findValue(row, [
        "Market Price",
        "Current Price",
        "Price",
        "Last Price",
        "Closing Price",
        "Unit Price",
        "Market Rate"
      ])
    );

    const marketValue = cleanNumber(
      findValue(row, [
        "Market Value",
        "Current Value",
        "Value",
        "Valuation",
        "Holding Value",
        "Portfolio Value",
        "Current Valuation",
        "Market Valuation",
        "Total Value",
        "Amount"
      ])
    );

    const profitLoss = cleanNumber(
      findValue(row, [
        "Profit Loss",
        "Profit/Loss",
        "Profit / Loss",
        "P/L",
        "Gain Loss",
        "Gain/Loss",
        "Unrealized P/L",
        "Unrealized Profit Loss",
        "Capital Gain"
      ])
    );

    const cleanSymbol = String(symbol || "").trim().toUpperCase();

    if (
      !cleanSymbol ||
      cleanSymbol === "N/A" ||
      cleanSymbol === "TOTAL" ||
      cleanSymbol.includes("TOTAL") ||
      quantity <= 0
    ) {
      return null;
    }

    const finalMarketPrice =
      marketPrice ||
      (marketValue > 0 && quantity > 0 ? marketValue / quantity : 0);

    const finalMarketValue =
      marketValue ||
      (quantity > 0 && finalMarketPrice > 0 ? quantity * finalMarketPrice : 0);

    if (finalMarketValue <= 0 && finalMarketPrice <= 0) {
      return null;
    }

    return applySecurityMaster({
      symbol: cleanSymbol,
      name: String(name || cleanSymbol).trim(),
      sector: String(sector || "Unknown").trim(),
      quantity,
      averagePrice,
      averageCost: averagePrice,
      marketPrice: finalMarketPrice,
      price: finalMarketPrice,
      marketValue: finalMarketValue,
      value: finalMarketValue,
      profitLoss: Number.isFinite(profitLoss) ? profitLoss : 0,
      source: "PORTFOLIO_VALUATION_UPLOAD",
      uploadedAt: new Date().toISOString()
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {reconciliationMode
            ? "Upload Broker Evidence"
            : "Import Portfolio"}
        </Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        {reconciliationMode
          ? "Upload a current broker valuation for read-only comparison with GateCEP's existing REAL portfolio. It will not change REAL holdings until you review and approve a correction."
          : "Upload a broker valuation CSV or Excel file. GateCEP will extract holdings, then let you review and edit before creating the initial REAL portfolio."}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recommended Columns</Text>
        <Text style={styles.body}>• Security / Symbol / Counter</Text>
        <Text style={styles.body}>• Quantity / Units / Shares</Text>
        <Text style={styles.body}>• Weighted Average Price</Text>
        <Text style={styles.body}>• Market Price</Text>
        <Text style={styles.body}>• Market Value / Valuation</Text>
        <Text style={styles.body}>• Profit / Loss</Text>
      </View>

      {reconciliationMode ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Broker account identity</Text>
          <Text style={styles.body}>
            The filename must end with this user's CDS number. Broker and trading account keep multiple accounts separate.
          </Text>
          <Text style={styles.label}>User CDS Number</Text>
          <TextInput
            value={cdsNumber}
            onChangeText={setCdsNumber}
            editable={!storedCdsNumber}
            keyboardType="number-pad"
            style={[styles.input, storedCdsNumber && styles.inputLocked]}
            placeholder="Enter the CDS shown at the end of the filename"
            placeholderTextColor="#64748b"
          />
          <Text style={styles.identityNote}>
            {storedCdsNumber
              ? "Verified user CDS — locked for this investor."
              : "First upload: this must match the number at the end of the selected filename."}
          </Text>
          <Text style={styles.label}>Broker ID</Text>
          <TextInput
            value={brokerId}
            onChangeText={setBrokerId}
            autoCapitalize="characters"
            style={styles.input}
            placeholder="AIB"
            placeholderTextColor="#64748b"
          />
          <Text style={styles.label}>Broker Client Account</Text>
          <TextInput
            value={tradingAccount}
            onChangeText={setTradingAccount}
            style={styles.input}
            placeholder="Enter the broker account number"
            placeholderTextColor="#64748b"
          />
        </View>
      ) : null}

      <Pressable style={styles.primary} onPress={pickFile}>
        <Text style={styles.primaryText}>
          {reconciliationMode
            ? "Upload Broker Evidence and Review"
            : "Upload CSV / Excel and Review"}
        </Text>
      </Pressable>

      {status ? (
        <View
          style={[
            styles.statusBox,
            status.toLowerCase().includes("failed") && styles.statusError
          ]}
        >
          <Text style={styles.statusText}>{status}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function findValue(row, names = []) {
  const keys = Object.keys(row || {});

  for (const name of names) {
    const found = keys.find((key) => normalizeKey(key) === normalizeKey(name));

    if (found) {
      return row[found];
    }
  }

  for (const name of names) {
    const found = keys.find((key) =>
      normalizeKey(key).includes(normalizeKey(name))
    );

    if (found) {
      return row[found];
    }
  }

  return "";
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[./_#()-]/g, "")
    .trim();
}

function cleanNumber(value) {
  const cleaned = String(value ?? "")
    .replaceAll(",", "")
    .replace(/KES/gi, "")
    .replace(/[^\d.-]/g, "")
    .trim();

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : 0;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 100 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  title: {
    color: "white",
    fontSize: 30,
    fontWeight: "900",
    flex: 1
  },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 22 },
  dashboardButton: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14
  },
  dashboardButtonText: {
    color: "#67e8f9",
    fontWeight: "900"
  },
  card: {
    marginTop: 24,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  cardTitle: {
    color: "#67e8f9",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10
  },
  body: {
    color: "#cbd5e1",
    marginTop: 8,
    lineHeight: 20
  },
  label: { color: "#94a3b8", marginTop: 16, marginBottom: 7 },
  input: {
    color: "white",
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13
  },
  inputLocked: { color: "#86efac", backgroundColor: "#0f1f1a" },
  identityNote: { color: "#94a3b8", fontSize: 12, marginTop: 6 },
  primary: {
    marginTop: 24,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  primaryText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  },
  statusBox: {
    marginTop: 18,
    backgroundColor: "rgba(34,197,94,.12)",
    borderColor: "rgba(34,197,94,.35)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14
  },
  statusError: {
    backgroundColor: "rgba(239,68,68,.12)",
    borderColor: "rgba(239,68,68,.35)"
  },
  statusText: {
    color: "#86efac"
  }
});
