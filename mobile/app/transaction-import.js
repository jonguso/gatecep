import React, { useState } from "react";
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
import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";
import * as XLSX from "xlsx";
import {
  requireSafeImportFile,
  requireSafeImportRows,
  safeWorkbookReadOptions
} from "../src/security/importFileSecurity";
import { userSetItem } from "../src/auth/userStorage";
import { buildSyncStatus } from "../src/portfolio/syncStatus";
import { partitionBrokerExecutionEvidence } from "../src/features/broker-sync/brokerExecutionEvidencePolicy";
import { ContainedPanel } from "../src/components/mobile/MobileUI";
import { extractBrokerPdf } from "../src/services/brokers/brokerPdfExtractionApi";

export default function TransactionImport() {
  const [form, setForm] = useState({
    symbol: "",
    side: "BUY",
    quantity: "",
    price: "",
    date: ""
  });

  const [transactions, setTransactions] = useState([]);
  const [status, setStatus] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  async function pickTransactionFile() {
    try {
      setStatus("Selecting transaction file...");

      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: [
          "text/csv",
          "application/csv",
          "application/pdf",
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

      await requireSafeImportFile(file);

      setSelectedFile(file);
      setStatus(`Selected ${file.name}. Reading transactions...`);

      const rows = await parseTransactionFile(file);
      const normalized = rows.map(normalizeTransaction).filter(Boolean);

      if (!normalized.length) {
        throw new Error(
          `No valid transactions found. File columns detected: ${Object.keys(
            rows[0] || {}
          ).join(", ")}`
        );
      }

      setTransactions(normalized);
      setStatus(`${file.name} imported. ${normalized.length} transactions ready.`);
    } catch (error) {
      setStatus(`Import failed: ${error.message}`);
      Alert.alert("Transaction Import Failed", error.message);
    }
  }

  async function parseTransactionFile(file) {
    const name = String(file.name || "").toLowerCase();

    if (name.endsWith(".pdf")) {
      const result = await extractBrokerPdf(file, "orders");
      return requireSafeImportRows(result.rows);
    }

    if (name.endsWith(".csv")) {
      const text = await readFileText(file);
      const workbook = XLSX.read(text, safeWorkbookReadOptions("string"));
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      return requireSafeImportRows(XLSX.utils.sheet_to_json(sheet, { defval: "" }));
    }

    const base64 = await readFileBase64(file);

    const workbook = XLSX.read(base64, safeWorkbookReadOptions("base64"));

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    return requireSafeImportRows(XLSX.utils.sheet_to_json(sheet, {
      defval: ""
    }));
  }

  async function readFileText(file) {
    if (Platform.OS === "web") {
      const response = await fetch(file.uri);
      return await response.text();
    }

    return await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.UTF8
    });
  }

  async function readFileBase64(file) {
    if (Platform.OS === "web") {
      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();

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

  function normalizeTransaction(row) {
    const keys = Object.keys(row);

    const findValue = (names) => {
      for (const name of names) {
        const foundKey = keys.find(
          (k) =>
            String(k).trim().toLowerCase() ===
            String(name).trim().toLowerCase()
        );

        if (foundKey) return row[foundKey];
      }

      return "";
    };

    const symbol = findValue([
      "Symbol",
      "Security",
      "Security Code",
      "Security Name",
      "Counter",
      "Share",
      "Stock",
      "Instrument"
    ]);

    const sideRaw = findValue([
      "Side",
      "Type",
      "Action",
      "Buy/Sell",
      "Buy or Sell",
      "Transaction Type",
      "Order Type"
    ]);

    const quantity = cleanNumber(
      findValue([
        "Quantity",
        "Qty",
        "Shares",
        "Units",
        "Volume",
        "Original Order Quantity",
        "Total Traded Quantity",
        "Pending Order Quantity",
        "Order Quantity"
      ])
    );

    const price = cleanNumber(
      findValue([
        "Price",
        "Rate",
        "Trade Price",
        "Market Price",
        "Unit Price",
        "Order Price"
      ])
    );

    const amount = cleanNumber(
      findValue(["Amount", "Value", "Consideration", "Gross Amount", "Net Amount"])
    );

    const date =
      findValue([
        "Date",
        "Trade Date",
        "Transaction Date",
        "Order Date",
        "Last Modified Date & Time"
      ]);

    const sideText = String(sideRaw).toUpperCase();

    const side =
      sideText.includes("SELL") ||
      sideText.includes("SALE") ||
      sideText.includes("DISPOSAL")
        ? "SELL"
        : "BUY";

    if (!symbol) return null;

    const finalQuantity = quantity || 0;
    const finalPrice =
      price || (amount > 0 && finalQuantity > 0 ? amount / finalQuantity : 0);

    if (!finalQuantity || !finalPrice) return null;

    return {
      symbol: String(symbol).trim().toUpperCase(),
      side,
      quantity: finalQuantity,
      price: finalPrice,
      date: String(date),
      value: amount || finalQuantity * finalPrice,
      source: selectedFile?.name || "MANUAL_OR_FILE",
      brokerReference: findValue(["Broker Reference", "Contract Note", "Contract Note Number", "Trade Reference", "Order Reference"]),
      broker: findValue(["Broker", "Broker Name", "Dealer"]),
      fees: cleanNumber(findValue(["Total Fees", "Fees", "Brokerage and Fees", "Charges"])),
      settlementStatus: findValue(["Settlement Status"]),
      settlementDate: findValue(["Settlement Date"])
    };
  }

  function addTransaction() {
    if (!form.symbol || !form.quantity || !form.price) {
      Alert.alert("Missing Info", "Enter symbol, quantity, and price.");
      return;
    }

    const item = {
      symbol: form.symbol.trim().toUpperCase(),
      side: form.side,
      quantity: cleanNumber(form.quantity),
      price: cleanNumber(form.price),
      date: form.date,
      value: cleanNumber(form.quantity) * cleanNumber(form.price),
      source: "MANUAL_ENTRY"
    };

    setTransactions([item, ...transactions]);

    setForm({
      symbol: "",
      side: "BUY",
      quantity: "",
      price: "",
      date: ""
    });
  }

  async function saveTransactions() {
  if (!transactions.length) {
    Alert.alert("No Transactions", "Add or upload at least one transaction.");
    return;
  }

  const { verified, unverified } = partitionBrokerExecutionEvidence(transactions);
  await userSetItem("transactionHistory", JSON.stringify(verified));
  await userSetItem("unverifiedTransactionHistory", JSON.stringify(unverified));
  await userSetItem("transactionsUploaded", verified.length ? "true" : "false");

  await userSetItem(
    "transactionUploadSummary",
    JSON.stringify({
      count: verified.length,
      rejectedCount: unverified.length,
      uploadedAt: new Date().toISOString(),
      source: selectedFile ? "TRANSACTION_IMPORT_FILE" : "MANUAL_ENTRY",
      fileName: selectedFile?.name || null
    })
  );

  await buildSyncStatus();

  Alert.alert("Evidence Reviewed", `${verified.length} verified broker executions saved; ${unverified.length} incomplete records remain UNVERIFIED.`);

  router.replace("/portfolio-sync-center");
}

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Broker Execution Evidence</Text>

      <Text style={styles.subtitle}>
        REAL activity requires broker date, reference, broker identity, executed quantity and price, fees, and settlement evidence. Manual or incomplete rows remain UNVERIFIED.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upload Transaction File</Text>

        <Text style={styles.help}>
          Select PDF, CSV, or Excel order history from your phone. Expected columns may
          include Symbol, Buy/Sell, Quantity, Price, and Date.
        </Text>

        <Pressable style={styles.secondary} onPress={pickTransactionFile}>
          <Text style={styles.secondaryText}>
            {selectedFile ? `Selected: ${selectedFile.name}` : "Upload Transaction File"}
          </Text>
        </Pressable>

        {status ? (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Manual Unverified Note</Text>
        <Text style={styles.help}>Manual entries cannot become REAL execution evidence. Use a broker file containing the required evidence fields.</Text>

        <TextInput
          placeholder="Symbol e.g. SCOM"
          placeholderTextColor="#64748b"
          value={form.symbol}
          onChangeText={(value) => setForm({ ...form, symbol: value })}
          autoCapitalize="characters"
          style={styles.input}
        />

        <View style={styles.sideRow}>
          {["BUY", "SELL"].map((side) => (
            <Pressable
              key={side}
              style={[styles.sideChip, form.side === side && styles.sideActive]}
              onPress={() => setForm({ ...form, side })}
            >
              <Text style={form.side === side ? styles.sideTextActive : styles.sideText}>
                {side}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          placeholder="Quantity"
          placeholderTextColor="#64748b"
          value={form.quantity}
          keyboardType="numeric"
          onChangeText={(value) => setForm({ ...form, quantity: value })}
          style={styles.input}
        />

        <TextInput
          placeholder="Price"
          placeholderTextColor="#64748b"
          value={form.price}
          keyboardType="numeric"
          onChangeText={(value) => setForm({ ...form, price: value })}
          style={styles.input}
        />

        <TextInput
          placeholder="Broker execution date YYYY-MM-DD"
          placeholderTextColor="#64748b"
          value={form.date}
          onChangeText={(value) => setForm({ ...form, date: value })}
          style={styles.input}
        />

        <Pressable style={styles.secondary} onPress={addTransaction}>
          <Text style={styles.secondaryText}>Add Transaction</Text>
        </Pressable>
      </View>

      {transactions.length > 0 && (
        <ContainedPanel title="Evidence Ready for Review" subtitle={`${transactions.length} imported record${transactions.length === 1 ? "" : "s"}`} testID="transaction-evidence-review-panel">

          {transactions.map((t, index) => (
            <View key={`${t.symbol}-${index}`} style={styles.txRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.symbol}>{t.symbol}</Text>
                <Text style={styles.small}>
                  {t.side} • {t.quantity} shares @ KES {money(t.price)}
                </Text>
                <Text style={styles.tiny}>{t.date}</Text>
              </View>

              <Text style={t.side === "BUY" ? styles.green : styles.red}>
                KES {money(t.value)}
              </Text>
            </View>
          ))}
        </ContainedPanel>
      )}

      <Pressable style={styles.primary} onPress={saveTransactions}>
        <Text style={styles.primaryText}>Validate Broker Evidence</Text>
      </Pressable>

      <Pressable style={styles.backButton} onPress={() => router.replace("/broker-upload")}>
        <Text style={styles.backText}>Back to Upload Center</Text>
      </Pressable>
    </ScrollView>
  );
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

function money(v) {
  return Number(v || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 100 },
  title: { color: "white", fontSize: 34, fontWeight: "900" },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 22 },
  card: {
    marginTop: 22,
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
    marginBottom: 14
  },
  help: {
    color: "#94a3b8",
    lineHeight: 20,
    marginBottom: 14
  },
  input: {
    backgroundColor: "#1e293b",
    color: "white",
    padding: 16,
    borderRadius: 16,
    marginTop: 12,
    fontSize: 16
  },
  sideRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12
  },
  sideChip: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1
  },
  sideActive: {
    backgroundColor: "#9333ea",
    borderColor: "#c084fc"
  },
  sideText: {
    color: "#94a3b8",
    textAlign: "center",
    fontWeight: "900"
  },
  sideTextActive: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  },
  secondary: {
    marginTop: 12,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 16
  },
  secondaryText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900"
  },
  txRow: {
    paddingVertical: 14,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10
  },
  symbol: {
    color: "white",
    fontSize: 16,
    fontWeight: "900"
  },
  small: {
    color: "#94a3b8",
    marginTop: 4
  },
  tiny: {
    color: "#64748b",
    marginTop: 4,
    fontSize: 12
  },
  green: {
    color: "#86efac",
    fontWeight: "900"
  },
  red: {
    color: "#fca5a5",
    fontWeight: "900"
  },
  primary: {
    marginTop: 22,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  primaryText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  },
  backButton: {
    marginTop: 14,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 18
  },
  backText: {
    color: "#cbd5e1",
    textAlign: "center",
    fontWeight: "900"
  },
  statusBox: {
    marginTop: 14,
    backgroundColor: "rgba(6,182,212,.12)",
    borderColor: "rgba(6,182,212,.35)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14
  },
  statusText: {
    color: "#cbd5e1",
    lineHeight: 20
  }
});
