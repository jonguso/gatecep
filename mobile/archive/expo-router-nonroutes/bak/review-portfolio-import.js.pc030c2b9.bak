import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getStoredAccessToken } from "../src/features/auth/storage/authStorage";

import { applySecurityMaster } from "../src/utils/nseSecurityMaster";
import {
  savePortfolio,
  normalizePortfolioHolding
} from "../src/portfolio/portfolioStore";
import { uploadConfirmedPortfolio } from "../src/portfolio/uploadPortfolioApi";
import { syncHoldingsToCloud } from "../src/features/portfolio/api/portfolioSyncApi";
import {
  userGetItem,
  userSetItem,
  userRemoveItem
} from "../src/auth/userStorage";
import { getCurrentSession } from "../src/auth/authStore";

export default function ReviewPortfolioImport() {
  const [fileInfo, setFileInfo] = useState(null);
  const [rows, setRows] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingRow, setEditingRow] = useState(null);

  useEffect(() => {
    loadDraft();
  }, []);

  async function loadDraft() {
    try {
      const pendingRaw =
        (await userGetItem("pendingPortfolioImport")) ||
        (await userGetItem("PendingPortfolioImport"));

      const scopedRaw =
        (await userGetItem("importedPortfolioDraft")) ||
        (await userGetItem("ImportedPortfolioDraft"));

      const legacyRaw = await AsyncStorage.getItem(
        "gatecepImportedPortfolioDraft"
      );

      const draftRaw = scopedRaw || legacyRaw;

      if (pendingRaw) setFileInfo(JSON.parse(pendingRaw));

      if (draftRaw) {
        const parsed = JSON.parse(draftRaw);
        const normalized = parsed.map((row) => normalizeImportedRow(row));

        setRows(normalized);
        await userSetItem("importedPortfolioDraft", JSON.stringify(normalized));
      }
    } catch (error) {
      Alert.alert("Import Review Error", error.message);
    }
  }

  function normalizeImportedRow(row = {}) {
    const mastered = applySecurityMaster(row);

    return normalizePortfolioHolding({
      ...mastered,
      symbol: String(mastered.symbol || "").toUpperCase().trim(),
      name: mastered.name || mastered.symbol,
      sector: mastered.sector || "Unknown",
      averagePrice:
        Number(mastered.averagePrice || mastered.averageCost || 0) ||
        inferAveragePrice(mastered),
      averageCost:
        Number(mastered.averageCost || mastered.averagePrice || 0) ||
        inferAveragePrice(mastered),
      marketPrice:
        Number(mastered.marketPrice || mastered.price || 0) ||
        inferMarketPrice(mastered),
      price:
        Number(mastered.price || mastered.marketPrice || 0) ||
        inferMarketPrice(mastered)
    });
  }

  function openEdit(index) {
    setEditingIndex(index);
    setEditingRow({ ...rows[index] });
  }

  async function saveEdit() {
    const nextRow = normalizeImportedRow(editingRow);
    const copy = [...rows];

    copy[editingIndex] = nextRow;
    setRows(copy);

    await userSetItem("importedPortfolioDraft", JSON.stringify(copy));
    await AsyncStorage.setItem(
      "gatecepImportedPortfolioDraft",
      JSON.stringify(copy)
    );

    setEditingIndex(null);
    setEditingRow(null);
  }

  async function addHolding() {
    const next = [
      ...rows,
      {
        symbol: "",
        name: "",
        sector: "",
        quantity: "",
        averagePrice: "",
        marketPrice: "",
        marketValue: "",
        profitLoss: ""
      }
    ];

    setRows(next);
    await userSetItem("importedPortfolioDraft", JSON.stringify(next));
    openEdit(next.length - 1);
  }

  async function removeHolding() {
    const copy = rows.filter((_, index) => index !== editingIndex);

    setRows(copy);
    await userSetItem("importedPortfolioDraft", JSON.stringify(copy));

    setEditingIndex(null);
    setEditingRow(null);
  }

  async function confirmPortfolio() {
    const portfolio = rows
      .filter((row) => row.symbol && Number(row.quantity || 0) > 0)
      .map((row) => {
        const mastered = applySecurityMaster(row);
        const qty = Number(mastered.quantity || 0);

        const rowMarketValue = Number(
          mastered.marketValue || mastered.value || 0
        );

        const rowMarketPrice = Number(
          mastered.marketPrice || mastered.price || 0
        );

        const rowProfitLoss = Number(
          mastered.profitLoss ||
            mastered.unrealizedPnL ||
            mastered.gainLoss ||
            0
        );

        const impliedCostValue =
          rowMarketValue > 0 && rowProfitLoss !== 0
            ? rowMarketValue - rowProfitLoss
            : 0;

        const fallbackAvgPrice =
          Number(
            mastered.averagePrice ||
              mastered.averageCost ||
              mastered.costPrice ||
              0
          ) ||
          (impliedCostValue > 0 && qty > 0
            ? impliedCostValue / qty
            : 0) ||
          (rowMarketValue > 0 && qty > 0 ? rowMarketValue / qty : 0) ||
          rowMarketPrice;

        const fallbackMarketPrice =
          rowMarketPrice ||
          (rowMarketValue > 0 && qty > 0 ? rowMarketValue / qty : 0) ||
          fallbackAvgPrice;

        return normalizePortfolioHolding({
          broker: "IMPORT_REVIEW",
          symbol: String(mastered.symbol || "").toUpperCase().trim(),
          name: mastered.name || mastered.symbol,
          sector: mastered.sector || "Unknown",
          quantity: qty,
          averagePrice: fallbackAvgPrice,
          averageCost: fallbackAvgPrice,
          marketPrice: fallbackMarketPrice,
          price: fallbackMarketPrice,
          marketValue: rowMarketValue || qty * fallbackMarketPrice,
          value: rowMarketValue || qty * fallbackMarketPrice,
          profitLoss: rowProfitLoss,
          source: "CONFIRMED_VALUATION_IMPORT"
        });
      });

    const cleanPortfolio = portfolio.filter((h) => {
      const symbol = String(h.symbol || "").trim().toUpperCase();
      const quantity = Number(h.quantity || 0);

      return symbol && symbol !== "N/A" && quantity > 0;
    });

    if (!cleanPortfolio.length) {
      Alert.alert("No valid holdings", "No valid holdings found to upload.");
      return;
    }

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

    await savePortfolio(cleanPortfolio);
    await uploadConfirmedPortfolio(cleanPortfolio, token);

    try {
      await syncHoldingsToCloud(cleanPortfolio);
    } catch (error) {
      console.log("Cloud portfolio sync skipped:", error.message);
    }

    await userSetItem("statementUploaded", "true");
    await AsyncStorage.setItem("gatecepStatementUploaded", "true");

    await userSetItem(
      "LatestUpload",
      JSON.stringify({
        uploadedAt: new Date().toISOString(),
        valuation: {
          reportType: "confirmed-import",
          fileName: fileInfo?.fileName || "Confirmed Portfolio",
          uploadedAt: new Date().toISOString(),
          manualEntry: false,
          confirmed: true,
          parsedHoldings: cleanPortfolio
        }
      })
    );

    await userRemoveItem("importedPortfolioDraft");
    await userRemoveItem("ImportedPortfolioDraft");
    await AsyncStorage.removeItem("gatecepImportedPortfolioDraft");

    Alert.alert("Portfolio Saved", "Your holdings have been saved.");
    router.replace("/broker-upload");
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Review Extracted Holdings</Text>

      <Text style={styles.subtitle}>
        Tap any security to review or edit before confirming.
      </Text>

      <View style={styles.fileCard}>
        <Text style={styles.cardTitle}>Imported File</Text>
        <Text style={styles.fileName}>
          {fileInfo?.fileName || "Unknown File"}
        </Text>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 1.2 }]}>Security</Text>
          <Text style={[styles.th, { flex: 1 }]}>Sector</Text>
          <Text style={[styles.th, { flex: 0.7, textAlign: "right" }]}>
            Qty
          </Text>
          <Text style={[styles.th, { flex: 0.9, textAlign: "right" }]}>
            Value
          </Text>
          <Text style={[styles.th, { flex: 0.8, textAlign: "right" }]}>
            P/L
          </Text>
        </View>

        {rows.map((row, index) => {
          const normalized = normalizeImportedRow(row);

          return (
            <Pressable
              key={`${normalized.symbol}-${index}`}
              style={styles.tr}
              onPress={() => openEdit(index)}
            >
              <Text style={[styles.tdStrong, { flex: 1.2 }]}>
                {normalized.symbol || "N/A"}
              </Text>

              <Text style={[styles.td, { flex: 1 }]}>
                {normalized.sector || "Unknown"}
              </Text>

              <Text style={[styles.td, { flex: 0.7, textAlign: "right" }]}>
                {Number(normalized.quantity || 0).toLocaleString()}
              </Text>

              <Text
                style={[styles.tdStrong, { flex: 0.9, textAlign: "right" }]}
              >
                {money(normalized.marketValue)}
              </Text>

              <Text
                style={[
                  Number(normalized.profitLoss || 0) >= 0
                    ? styles.green
                    : styles.red,
                  { flex: 0.8, textAlign: "right" }
                ]}
              >
                {money(normalized.profitLoss)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.secondary} onPress={addHolding}>
        <Text style={styles.secondaryText}>Add Security</Text>
      </Pressable>

      <Pressable style={styles.primary} onPress={confirmPortfolio}>
        <Text style={styles.primaryText}>Confirm Portfolio</Text>
      </Pressable>

      <Modal visible={editingRow !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit Holding</Text>

            {editingRow ? (
              <>
                <Field
                  label="Symbol"
                  value={editingRow.symbol}
                  onChange={(v) =>
                    setEditingRow({
                      ...editingRow,
                      symbol: v
                    })
                  }
                />

                <Field
                  label="Sector"
                  value={editingRow.sector}
                  onChange={(v) =>
                    setEditingRow({
                      ...editingRow,
                      sector: v
                    })
                  }
                />

                <Field
                  label="Quantity"
                  value={editingRow.quantity}
                  onChange={(v) =>
                    setEditingRow({
                      ...editingRow,
                      quantity: v
                    })
                  }
                />

                <Field
                  label="Avg Price / Cost"
                  value={editingRow.averagePrice}
                  onChange={(v) =>
                    setEditingRow({
                      ...editingRow,
                      averagePrice: v
                    })
                  }
                />

                <Field
                  label="Market Price"
                  value={editingRow.marketPrice}
                  onChange={(v) =>
                    setEditingRow({
                      ...editingRow,
                      marketPrice: v
                    })
                  }
                />

                <Field
                  label="Market Value"
                  value={editingRow.marketValue || editingRow.value}
                  onChange={(v) =>
                    setEditingRow({
                      ...editingRow,
                      marketValue: v,
                      value: v
                    })
                  }
                />

                <Field
                  label="Profit / Loss"
                  value={editingRow.profitLoss}
                  onChange={(v) =>
                    setEditingRow({
                      ...editingRow,
                      profitLoss: v
                    })
                  }
                />

                <Pressable style={styles.primary} onPress={saveEdit}>
                  <Text style={styles.primaryText}>Save Changes</Text>
                </Pressable>

                <Pressable style={styles.danger} onPress={removeHolding}>
                  <Text style={styles.dangerText}>Remove Holding</Text>
                </Pressable>

                <Pressable
                  style={styles.secondary}
                  onPress={() => {
                    setEditingIndex(null);
                    setEditingRow(null);
                  }}
                >
                  <Text style={styles.secondaryText}>Cancel</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function inferAveragePrice(row = {}) {
  const qty = Number(row.quantity || 0);
  const marketValue = Number(row.marketValue || row.value || 0);
  const marketPrice = Number(row.marketPrice || row.price || 0);
  const profitLoss = Number(row.profitLoss || row.unrealizedPnL || 0);

  const impliedCostValue =
    marketValue > 0 && profitLoss !== 0 ? marketValue - profitLoss : 0;

  if (Number(row.averagePrice || row.averageCost || 0) > 0) {
    return Number(row.averagePrice || row.averageCost || 0);
  }

  if (impliedCostValue > 0 && qty > 0) {
    return impliedCostValue / qty;
  }

  if (marketValue > 0 && qty > 0) {
    return marketValue / qty;
  }

  return marketPrice;
}

function inferMarketPrice(row = {}) {
  const qty = Number(row.quantity || 0);
  const marketValue = Number(row.marketValue || row.value || 0);
  const marketPrice = Number(row.marketPrice || row.price || 0);

  if (marketPrice > 0) return marketPrice;

  if (marketValue > 0 && qty > 0) {
    return marketValue / qty;
  }

  return inferAveragePrice(row);
}

function Field({ label, value, onChange }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={String(value || "")}
        onChangeText={onChange}
        placeholder={label}
        placeholderTextColor="#64748b"
      />
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
  content: { padding: 22, paddingTop: 70, paddingBottom: 40 },
  title: { color: "white", fontSize: 32, fontWeight: "900" },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 21 },
  fileCard: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1e293b"
  },
  cardTitle: { color: "#67e8f9", fontWeight: "900" },
  fileName: { color: "white", marginTop: 10 },
  table: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
    overflow: "hidden"
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#020617",
    paddingVertical: 12,
    paddingHorizontal: 10
  },
  th: { color: "#94a3b8", fontSize: 11, fontWeight: "900" },
  tr: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    alignItems: "center"
  },
  td: { color: "#cbd5e1", fontSize: 12 },
  tdStrong: { color: "white", fontSize: 12, fontWeight: "900" },
  green: { color: "#86efac", fontSize: 12, fontWeight: "900" },
  red: { color: "#fca5a5", fontSize: 12, fontWeight: "900" },
  primary: {
    marginTop: 20,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 16
  },
  primaryText: {
    color: "white",
    fontWeight: "900",
    textAlign: "center"
  },
  secondary: {
    marginTop: 14,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 16
  },
  secondaryText: {
    color: "#67e8f9",
    fontWeight: "900",
    textAlign: "center"
  },
  danger: {
    marginTop: 14,
    backgroundColor: "rgba(239,68,68,.12)",
    borderColor: "rgba(239,68,68,.35)",
    borderWidth: 1,
    padding: 15,
    borderRadius: 16
  },
  dangerText: {
    color: "#fca5a5",
    textAlign: "center",
    fontWeight: "900"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.75)",
    justifyContent: "center",
    padding: 18
  },
  modal: {
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    maxHeight: "90%"
  },
  modalTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "900"
  },
  label: {
    color: "#94a3b8",
    fontSize: 12
  },
  input: {
    marginTop: 8,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#334155",
    padding: 14,
    borderRadius: 12,
    color: "white"
  }
});