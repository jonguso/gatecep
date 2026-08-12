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
import { router } from "expo-router";
import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system/legacy";

import {
  userSetItem
} from "../../src/auth/userStorage";
import { getCurrentSession } from "../../src/auth/authStore";
import { API_URL } from "../../src/config/apiConfig";
import { getStoredAccessToken } from "../../src/features/auth/storage/authStorage";

export default function Funds() {
  const [cash, setCash] = useState("");
  const [broker, setBroker] = useState("AIB");
  const [status, setStatus] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  async function pickStatementFile() {
    try {
      setStatus("Selecting statement file...");

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

      setSelectedFile(file);
      setStatus(`Selected ${file.name}. Reading statement...`);

      const rows = await parseStatementFile(file);

      if (!rows.length) {
        throw new Error("No rows found in statement file.");
      }

      const extractedCash = extractAvailableCash(rows);

      if (!Number.isFinite(extractedCash) || extractedCash < 0) {
        throw new Error(
          "Could not detect available cash. Enter the amount manually below."
        );
      }

      setCash(String(extractedCash));
      setStatus(
        `${file.name} read successfully. Available cash detected: KES ${money(
          extractedCash
        )}`
      );
    } catch (error) {
      setStatus(`Statement read failed: ${error.message}`);
      Alert.alert("Statement Read Failed", error.message);
    }
  }

  async function parseStatementFile(file) {
    const name = String(file.name || "").toLowerCase();

    if (name.endsWith(".csv")) {
      const text = await readFileText(file);

      const workbook = XLSX.read(text, {
        type: "string"
      });

      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      return XLSX.utils.sheet_to_json(sheet, {
        defval: ""
      });
    }

    const base64 = await readFileBase64(file);

    const workbook = XLSX.read(base64, {
      type: "base64"
    });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    return XLSX.utils.sheet_to_json(sheet, {
      defval: ""
    });
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

  function extractAvailableCash(rows) {
    if (!rows.length) return 0;

    const priorityKeys = [
      "Available Cash",
      "availableCash",
      "Available Balance",
      "availableBalance",
      "Trading Space",
      "tradingSpace",
      "Ledger Balance",
      "ledgerBalance",
      "Cash Balance",
      "cashBalance",
      "Balance",
      "balance"
    ];

    let bestValue = null;

    rows.forEach((row) => {
      priorityKeys.forEach((key) => {
        if (row[key] !== undefined && row[key] !== "") {
          const value = cleanNumber(row[key]);

          if (Number.isFinite(value)) {
            bestValue = value;
          }
        }
      });
    });

    if (bestValue !== null) {
      return bestValue;
    }

    const lastRow = rows[rows.length - 1];

    for (const key of Object.keys(lastRow)) {
      const keyLower = String(key).toLowerCase();

      if (
        keyLower.includes("balance") ||
        keyLower.includes("cash") ||
        keyLower.includes("trading") ||
        keyLower.includes("ledger")
      ) {
        const value = cleanNumber(lastRow[key]);

        if (Number.isFinite(value)) {
          return value;
        }
      }
    }

    return NaN;
  }

  async function saveStatement() {
    try {
      const amount = cleanNumber(cash);

      if (!Number.isFinite(amount) || amount < 0) {
        Alert.alert("Invalid Amount", "Enter available cash / trading space.");
        return;
      }

      const summary = {
        broker,
        availableCash: amount,
        uploadedAt: new Date().toISOString(),
        source: selectedFile
          ? "MOBILE_STATEMENT_UPLOAD"
          : "MANUAL_STATEMENT_ENTRY",
        fileName: selectedFile?.name || null
      };

      await userSetItem("availableCash", String(amount));
      await userSetItem("cashStatementUploaded", "true");
      await userSetItem("statementSummary", JSON.stringify(summary));

      const session = await getCurrentSession();

const token =
  session?.token ||
  session?.accessToken ||
  session?.user?.token ||
  session?.user?.accessToken ||
  (await getStoredAccessToken());

      if (!token) {
        Alert.alert("Session expired", "Please log in again.");
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/user-cash`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
  broker,
  amount,
  cashBalance: amount,
  availableCash: amount,
  ledgerBalance: amount,
  balance: amount,
  type: "STATEMENT_CASH_UPDATE",
  source: summary.source,
  fileName: summary.fileName
})
      });

      const data = await response.json();

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "Unable to update backend cash");
      }

      Alert.alert("Statement Saved", "Available cash updated.");
      router.replace("/broker-upload");
    } catch (error) {
      Alert.alert("Cash Update Failed", error.message);
      setStatus(`Cash update failed: ${error.message}`);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Funds</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Import or enter your broker cash / ledger statement to calculate
        available cash for Coach G.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Broker</Text>

        {["AIB", "ABC", "NCBA", "Dyer & Blair"].map((b) => (
          <Pressable
            key={b}
            style={[styles.option, broker === b && styles.optionActive]}
            onPress={() => setBroker(b)}
          >
            <Text style={broker === b ? styles.optionTextActive : styles.optionText}>
              {b}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Statement Upload</Text>

        <Text style={styles.help}>
          Select a CSV or Excel statement from your phone. Gatecep will try to
          detect available cash, trading space, or ledger balance.
        </Text>

        <Pressable style={styles.secondary} onPress={pickStatementFile}>
          <Text style={styles.secondaryText}>
            {selectedFile ? `Selected: ${selectedFile.name}` : "Upload Statement File"}
          </Text>
        </Pressable>

        {status ? (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cash / Trading Space</Text>

        <Text style={styles.help}>
          Confirm or manually enter the available cash from your broker
          statement.
        </Text>

        <TextInput
          placeholder="Available Cash e.g. 12500"
          placeholderTextColor="#64748b"
          keyboardType="numeric"
          value={cash}
          onChangeText={setCash}
          style={styles.input}
        />
      </View>

      <Pressable style={styles.primary} onPress={saveStatement}>
        <Text style={styles.primaryText}>Save Statement</Text>
      </Pressable>

      <Pressable
        style={styles.backButton}
        onPress={() => router.replace("/broker-upload")}
      >
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

  return Number.isFinite(number) ? number : NaN;
}

function money(v) {
  return Number(v || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 90 },
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
    marginBottom: 12
  },
  option: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#1e293b",
    marginTop: 10
  },
  optionActive: { backgroundColor: "#9333ea" },
  optionText: { color: "#cbd5e1", fontWeight: "800" },
  optionTextActive: { color: "white", fontWeight: "900" },
  help: { color: "#94a3b8", lineHeight: 20, marginBottom: 14 },
  input: {
    backgroundColor: "#1e293b",
    color: "white",
    padding: 18,
    borderRadius: 16,
    fontSize: 16
  },
  primary: {
    marginTop: 22,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  primaryText: { color: "white", textAlign: "center", fontWeight: "900" },
  secondary: {
    marginTop: 12,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 18
  },
  secondaryText: { color: "#67e8f9", textAlign: "center", fontWeight: "900" },
  backButton: {
    marginTop: 14,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 18
  },
  backText: { color: "#cbd5e1", textAlign: "center", fontWeight: "900" },
  statusBox: {
    marginTop: 14,
    backgroundColor: "rgba(6,182,212,.12)",
    borderColor: "rgba(6,182,212,.35)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
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
  statusText: {
    color: "#cbd5e1",
    lineHeight: 20
  }
});