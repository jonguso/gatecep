import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system/legacy";
import {
  requireSafeImportFile,
  requireSafeImportRows,
  safeWorkbookReadOptions
} from "../src/security/importFileSecurity";
import { router } from "expo-router";

import ActiveUserBanner from "../src/components/ActiveUserBanner";
import { userSetItem } from "../src/auth/userStorage";
import { buildSyncStatus } from "../src/portfolio/syncStatus";
import { partitionBrokerExecutionEvidence } from "../src/features/broker-sync/brokerExecutionEvidencePolicy";
import { ContainedPanel } from "../src/components/mobile/MobileUI";
import { extractBrokerPdf } from "../src/services/brokers/brokerPdfExtractionApi";

export default function TransactionsUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [status, setStatus] = useState("");

  async function pickFile() {
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
      setStatus(`Reading ${file.name}...`);

      const rows = await parseFile(file);
      const normalized = normalizeTransactions(rows);

      if (!normalized.length) {
        throw new Error(
          "Could not detect transaction columns. Expected broker history columns such as Order Date, Security Code, Buy or Sell, Order Quantity, Order Price, and Order Status."
        );
      }

      setTransactions(normalized);
      setStatus(`${normalized.length} transactions detected.`);
    } catch (error) {
      setTransactions([]);
      setStatus(`Upload failed: ${error.message}`);
      Alert.alert("Upload Failed", error.message);
    }
  }

  async function parseFile(file) {
    const name = String(file.name || "").toLowerCase();

    if (name.endsWith(".pdf")) {
      const result = await extractBrokerPdf(file, "orders");
      return requireSafeImportRows(result.rows);
    }

    if (name.endsWith(".csv")) {
      const text = await readFileText(file);

      const workbook = XLSX.read(text, safeWorkbookReadOptions("string"));

      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      return requireSafeImportRows(XLSX.utils.sheet_to_json(sheet, {
        defval: ""
      }));
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

  function normalizeTransactions(rows = []) {
    return rows
      .map((row, index) => {
        const date =
          readColumn(row, [
            "Date",
            "Trade Date",
            "Transaction Date",
            "Order Date",
            "date"
          ]);

        const symbol = String(
          readColumn(row, [
            "Symbol",
            "Security",
            "Ticker",
            "Code",
            "Counter",
            "Scrip",
            "Stock",
            "Security Code",
            "Instrument"
          ]) || ""
        )
          .trim()
          .toUpperCase();

        const sideRaw = String(
          readColumn(row, [
            "Side",
            "Type",
            "Action",
            "Transaction Type",
            "Transaction",
            "Buy/Sell",
            "Buy Sell",
            "Buy or Sell",
            "B/S",
            "Order Side",
            "Trade Type"
          ]) || ""
        )
          .trim()
          .toUpperCase();

        const side =
          sideRaw === "B" || sideRaw.includes("BUY")
            ? "BUY"
            : sideRaw === "S" || sideRaw.includes("SELL")
            ? "SELL"
            : "";

        const quantity = cleanNumber(
          readColumn(row, [
            "Quantity",
            "Qty",
            "Shares",
            "Units",
            "No. of Shares",
            "No of Shares",
            "Volume",
            "Trade Quantity",
            "Order Quantity",
            "Traded Quantity",
            "Total Traded Quantity"
          ])
        );

        const price = cleanNumber(
          readColumn(row, [
            "Price",
            "Unit Price",
            "Trade Price",
            "Rate",
            "Average Price",
            "Avg Price",
            "Execution Price",
            "Order Price"
          ])
        );

        const valueFromFile = cleanNumber(
          readColumn(row, [
            "Value",
            "Amount",
            "Consideration",
            "Gross Amount",
            "Net Amount",
            "Total",
            "Trade Value",
            "Transaction Value"
          ])
        );

        const value =
          Number.isFinite(valueFromFile) && valueFromFile > 0
            ? valueFromFile
            : quantity * price;

        const finalPrice =
          price > 0
            ? price
            : quantity > 0 && value > 0
            ? value / quantity
            : 0;

        if (!symbol || !side || quantity <= 0 || finalPrice <= 0) {
          return null;
        }

        return {
          id: `TX-${Date.now()}-${index}`,
          date,
          symbol,
          name: readColumn(row, ["Security Name", "Company", "Name"]) || symbol,
          side,
          quantity,
          price: finalPrice,
          value,
          status: readColumn(row, ["Order Status", "Status"]) || "UNKNOWN",
          brokerReference: readColumn(row, ["Broker Reference", "Contract Note", "Contract Note Number", "Trade Reference", "Order Reference"]),
          broker: readColumn(row, ["Broker", "Broker Name", "Dealer"]),
          fees: cleanNumber(readColumn(row, ["Total Fees", "Fees", "Brokerage and Fees", "Charges"])),
          settlementStatus: readColumn(row, ["Settlement Status"]),
          settlementDate: readColumn(row, ["Settlement Date"]),
          source: "TRANSACTION_UPLOAD",
          uploadedAt: new Date().toISOString()
        };
      })
      .filter(Boolean);
  }

  function readColumn(row, names = []) {
    for (const name of names) {
      if (row[name] !== undefined && row[name] !== "") {
        return row[name];
      }
    }

    const keys = Object.keys(row);

    for (const key of keys) {
      const normalizedKey = String(key)
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[./_-]/g, "");

      const match = names.some((name) => {
        const normalizedName = String(name)
          .toLowerCase()
          .replace(/\s+/g, "")
          .replace(/[./_-]/g, "");

        return normalizedKey === normalizedName;
      });

      if (match && row[key] !== "") {
        return row[key];
      }
    }

    return "";
  }

  async function saveTransactions() {
    if (!transactions.length) {
      Alert.alert("No Transactions", "Upload a transaction file first.");
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
        fileName: selectedFile?.name || null,
        uploadedAt: new Date().toISOString()
      })
    );

    await buildSyncStatus();

    Alert.alert("Evidence Reviewed", `${verified.length} verified broker executions saved; ${unverified.length} incomplete records remain UNVERIFIED.`);
    router.replace("/portfolio-sync-center");
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Broker Execution Upload</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>Upload read-only broker execution evidence. Incomplete records remain UNVERIFIED and cannot affect the REAL portfolio.</Text>

      <ActiveUserBanner />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upload File</Text>

        <Text style={styles.help}>
          Supported examples: Order Date, Security Code, Buy or Sell, Order
          Quantity, Traded Quantity, Order Price, Order Status.
        </Text>

        <Pressable style={styles.secondary} onPress={pickFile}>
          <Text style={styles.secondaryText}>
            {selectedFile
              ? `Selected: ${selectedFile.name}`
              : "Select PDF, CSV, or Excel File"}
          </Text>
        </Pressable>

        {status ? (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}
      </View>

      <ContainedPanel title="Evidence Preview" subtitle={`${transactions.length} imported record${transactions.length === 1 ? "" : "s"}`} emptyMessage="No transactions loaded yet." testID="broker-execution-preview-panel">

        {transactions.length === 0 ? (
          null
        ) : (
          transactions.slice(0, 10).map((tx) => (
            <View key={tx.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.symbol}>{tx.symbol}</Text>
                <Text style={styles.small}>
                  {tx.date} • {tx.side} • Qty {tx.quantity}
                </Text>
                <Text style={styles.small}>
                  {tx.name} • {tx.status}
                </Text>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.value}>KES {money(tx.value)}</Text>
                <Text style={styles.small}>@ {money(tx.price)}</Text>
              </View>
            </View>
          ))
        )}

        {transactions.length > 10 ? (
          <Text style={styles.more}>
            + {transactions.length - 10} more transactions
          </Text>
        ) : null}
      </ContainedPanel>

      <Pressable style={styles.primary} onPress={saveTransactions}>
        <Text style={styles.primaryText}>Validate Broker Evidence</Text>
      </Pressable>

      <Pressable
        style={styles.backButton}
        onPress={() => router.replace("/portfolio-sync-center")}
      >
        <Text style={styles.backText}>Back to Sync Center</Text>
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

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
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
  subtitle: {
    color: "#94a3b8",
    marginTop: 10,
    lineHeight: 22
  },
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
    marginTop: 20,
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
    marginBottom: 12
  },
  help: {
    color: "#94a3b8",
    lineHeight: 20
  },
  body: {
    color: "#cbd5e1",
    lineHeight: 21,
    marginTop: 8
  },
  secondary: {
    marginTop: 16,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 16
  },
  secondaryText: {
    color: "#67e8f9",
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
  },
  row: {
    marginTop: 12,
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  symbol: {
    color: "white",
    fontWeight: "900",
    fontSize: 16
  },
  small: {
    color: "#94a3b8",
    marginTop: 4,
    fontSize: 12
  },
  value: {
    color: "white",
    fontWeight: "900"
  },
  more: {
    color: "#67e8f9",
    fontWeight: "900",
    marginTop: 14
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
  }
});
