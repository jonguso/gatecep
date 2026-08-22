import React, { useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import { useAuth } from "../src/features/auth/hooks/useAuth";
import {
  MobileHeader,
  MobileScreen,
  StatusBanner,
  StickyActionBar
} from "../src/components/mobile/MobileUI";
import {
  commitMyStocksMarketCsv,
  previewMyStocksMarketCsv
} from "../src/services/markets/manualMarketImportApi";

function nairobiDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export default function MarketPriceImport() {
  const { accessToken } = useAuth();
  const [file, setFile] = useState(null);
  const [csvText, setCsvText] = useState("");
  const [marketDate, setMarketDate] = useState(nairobiDate());
  const [importKey, setImportKey] = useState("");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const payload = useMemo(() => ({
    csvText,
    fileName: file?.name || "mystocks-market-data.csv",
    marketDate
  }), [csvText, file, marketDate]);

  async function chooseFile() {
    setError("");
    setPreview(null);
    setResult(null);
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["text/csv", "text/comma-separated-values", "application/csv", "text/plain"],
      copyToCacheDirectory: true,
      multiple: false
    });
    if (picked.canceled) return;
    const selected = picked.assets?.[0];
    if (!selected?.uri) return;
    try {
      let text;
      if (Platform.OS === "web") {
        // Prefer the browser File exposed by DocumentPicker. The blob URI
        // fallback supports Expo web versions that omit the File object.
        text = selected.file?.text
          ? await selected.file.text()
          : await fetch(selected.uri).then((response) => {
              if (!response.ok) throw new Error("The selected CSV could not be opened.");
              return response.text();
            });
      } else {
        text = await FileSystem.readAsStringAsync(selected.uri, {
          encoding: FileSystem.EncodingType.UTF8
        });
      }
      if (!text?.trim()) throw new Error("The selected CSV is empty.");
      setFile(selected);
      setCsvText(text);
    } catch (nextError) {
      setFile(null);
      setCsvText("");
      setError(nextError?.message || "The selected CSV could not be read.");
    }
  }

  async function previewFile() {
    if (!csvText) return setError("Select a myStocks CSV first.");
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await previewMyStocksMarketCsv(payload, { accessToken, importKey });
      setPreview(response.preview);
    } catch (nextError) {
      setPreview(null);
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  async function commitFile() {
    if (!preview) return;
    setBusy(true);
    setError("");
    try {
      const response = await commitMyStocksMarketCsv(payload, { accessToken, importKey });
      setResult(response);
      setPreview(null);
      Alert.alert("Market import complete", response.message);
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <MobileScreen
      testID="pc030m10e-market-price-import"
      footer={preview ? (
        <StickyActionBar
          secondaryLabel="Cancel"
          onSecondary={() => setPreview(null)}
          primaryLabel={busy ? "Importing…" : "Confirm Price Import"}
          primaryDisabled={busy}
          onPrimary={commitFile}
        />
      ) : null}
    >
      <MobileHeader
        title="Market Price Import"
        subtitle="Temporary restricted import for licensed myStocks CSV exports. Prices only—holdings, quantities, cash, and cost basis never change."
        onBack={() => router.back()}
        actionLabel="Home"
        onAction={() => router.replace("/(tabs)/dashboard")}
      />

      <StatusBanner
        tone="warning"
        title="Manual verified evidence"
        message="Use Equities Real-Time Market Watch for portfolio valuation. NSE Daily Pricelist is stored as audit evidence and does not replace current prices."
      />

      <View style={styles.card}>
        <Text style={styles.heading}>1. Import authorization</Text>
        <TextInput
          value={importKey}
          onChangeText={setImportKey}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Restricted backend import key"
          placeholderTextColor="#64748b"
          style={styles.input}
        />
        <Text style={styles.label}>NSE market date</Text>
        <TextInput
          value={marketDate}
          onChangeText={setMarketDate}
          autoCapitalize="none"
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#64748b"
          style={styles.input}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>2. Select myStocks CSV</Text>
        <Pressable style={styles.fileButton} onPress={chooseFile}>
          <Text style={styles.fileButtonText}>{file?.name || "Choose CSV File"}</Text>
        </Pressable>
        {file ? <Text style={styles.muted}>{Math.max(1, Math.round((file.size || csvText.length) / 1024))} KB selected</Text> : null}
        <Pressable
          disabled={busy || !file}
          style={[styles.previewButton, (busy || !file) && styles.disabled]}
          onPress={previewFile}
        >
          <Text style={styles.previewText}>{busy ? "Validating…" : "Validate and Preview"}</Text>
        </Pressable>
      </View>

      {preview ? (
        <View style={styles.card}>
          <Text style={styles.heading}>3. Confirm preview</Text>
          <Row label="Export" value={preview.kind} />
          <Row label="Market date" value={preview.marketDate} />
          <Row label="Usable prices" value={preview.count} />
          <Row label="Rejected rows" value={preview.rejectedCount} />
          <Row label="Valuation eligible" value={preview.valuationEligible ? "YES" : "NO — AUDIT ONLY"} />
          <Text style={styles.checksum}>SHA-256 {preview.checksum}</Text>
        </View>
      ) : null}

      {result ? (
        <StatusBanner
          tone="success"
          title={result.auditOnly ? "Daily evidence saved" : "Portfolio prices ready"}
          message={result.message}
        />
      ) : null}
      {error ? <StatusBanner tone="danger" title="Import blocked" message={error} /> : null}
    </MobileScreen>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{String(value ?? "N/A")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 14, padding: 15, borderRadius: 18, backgroundColor: "#0f172a", borderColor: "#1e293b", borderWidth: 1 },
  heading: { color: "#67e8f9", fontSize: 17, fontWeight: "900", marginBottom: 12 },
  label: { color: "#94a3b8", fontSize: 12, marginTop: 12, marginBottom: 6 },
  input: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: "#334155", backgroundColor: "#020617", color: "white", paddingHorizontal: 13 },
  fileButton: { minHeight: 52, borderRadius: 14, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center", padding: 12 },
  fileButtonText: { color: "#67e8f9", fontWeight: "900", textAlign: "center" },
  muted: { color: "#94a3b8", marginTop: 7, fontSize: 11 },
  previewButton: { minHeight: 52, borderRadius: 14, marginTop: 12, backgroundColor: "#9333ea", alignItems: "center", justifyContent: "center" },
  previewText: { color: "white", fontWeight: "900" },
  disabled: { opacity: 0.4 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 9, borderBottomColor: "#1e293b", borderBottomWidth: 1 },
  rowLabel: { color: "#94a3b8", flex: 1 },
  rowValue: { color: "white", fontWeight: "900", textAlign: "right", flex: 1 },
  checksum: { color: "#64748b", fontSize: 9, marginTop: 12 }
});
