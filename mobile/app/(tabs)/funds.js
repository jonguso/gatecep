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
import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system/legacy";
import {
  requireSafeImportFile,
  requireSafeImportRows,
  safeWorkbookReadOptions
} from "../../src/security/importFileSecurity";

import {
  userGetItem,
  userSetItem
} from "../../src/auth/userStorage";

import {
  loadInvestorContext,
  savePracticePortfolio
} from "../../src/features/investor/investorContextStore";
import { getCurrentSession } from "../../src/auth/authStore";
import { API_URL } from "../../src/config/apiConfig";
import { extractBrokerPdf } from "../../src/services/brokers/brokerPdfExtractionApi";
import { getStoredAccessToken } from "../../src/features/auth/storage/authStorage";
import {
  refreshCanonicalRealPortfolioSnapshot
} from "../../src/services/portfolio/portfolioSnapshotTrigger";
import {
  attachVerifiedBrokerCashEvidence,
  loadBrokerMirror
} from "../../src/features/broker-sync/brokerSyncService";
import {
  extractStatementIdentity,
  loadVerifiedUserCds,
  requireValidBrokerEvidenceIdentity
} from "../../src/features/broker-sync/brokerEvidenceIdentityService";
import { loadBrokerAccounts } from "../../src/services/brokers/brokerAccountStore";
import {
  extractStatementEffectiveDate,
  hasConnectedRealBrokerAccount,
  requireVerifiedBrokerCashEvidence
} from "../../src/features/broker-sync/brokerCashEvidencePolicy";

import { normalizeBrokerCashStatementEvents } from "../../src/features/trading/cashLedgerEvidenceService";
import { rebuildCanonicalPortfolioLedger } from "../../src/features/trading/canonicalPortfolioLedgerService";

// PC-030M20AV3J RESPONSIVE CALIBRATION
export default function Funds() {
  const params = useLocalSearchParams();

  const practiceMode =
    String(params?.source || "").toUpperCase() === "PRACTICE";

  const returnToOrdersReview =
    practiceMode &&
    String(params?.returnTo || "").toUpperCase() ===
      "ORDERS_REVIEW";

  const reconciliationMode =
    !practiceMode &&
    String(params?.mode || "").toUpperCase() === "RECONCILE";

  const [cash, setCash] = useState("");
  const [practiceAvailableCash, setPracticeAvailableCash] =
    useState(0);
  const [practiceLoading, setPracticeLoading] =
    useState(false);

  // PC-032G4B1C7E2E
  //
  // Practice funding authority remains unchanged. Funds may mutate
  // availableCash only for an existing ACTIVE Practice Portfolio.
  //
  // React Native Alert callbacks are not a reliable recovery surface
  // on web, so browser flows expose funding validation/recovery inline.
  const [practiceFundingFeedback, setPracticeFundingFeedback] =
    useState(null);
  const [broker, setBroker] = useState("AIB");
  const [status, setStatus] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [statementRows, setStatementRows] = useState([]);
  const [statementIdentity, setStatementIdentity] = useState(null);
  const [statementEffectiveDate, setStatementEffectiveDate] = useState(null);
  const [connectedRealBroker, setConnectedRealBroker] = useState(false);

  useEffect(() => {
    if (practiceMode) {
      setConnectedRealBroker(false);
      loadPracticeFunds();

      /*
       * Practice funding amount passed from an investor-facing
       * affordability boundary is presentation context only.
       *
       * updatePracticeFunds() remains the sole mutation owner and
       * performs its existing validation before any Practice cash
       * change.
       */
      const requestedAmount =
        Number(params?.amount || 0);

      if (
        Number.isFinite(requestedAmount) &&
        requestedAmount > 0
      ) {
        setCash(
          requestedAmount.toFixed(2)
        );
      }

      return;
    }

    loadBrokerAccounts()
      .then((accounts) => setConnectedRealBroker(hasConnectedRealBrokerAccount(accounts)))
      .catch(() => setConnectedRealBroker(false));
  }, [practiceMode, params?.amount]);

  async function loadPracticeFunds() {
    try {
      setPracticeLoading(true);

      const context =
        await loadInvestorContext();

      const practice =
        context?.practicePortfolio;

      if (
        !practice ||
        practice?.status !== "ACTIVE"
      ) {
        setPracticeAvailableCash(0);
        return;
      }

      setPracticeAvailableCash(
        Math.max(
          0,
          Number(
            practice?.availableCash ||
            0
          )
        )
      );
    } catch (error) {
      console.error(
        "Unable to load Practice funds:",
        error
      );

      setPracticeAvailableCash(0);
    } finally {
      setPracticeLoading(false);
    }
  }

  async function pickStatementFile() {
    try {
      setStatus("Selecting statement file...");

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
      setStatus(`Selected ${file.name}. Reading statement...`);

      const parsed = await parseStatementFile(file);
      const rows = parsed.rows;
      setStatementRows(rows);

      if (!rows.length) {
        throw new Error("No rows found in statement file.");
      }

      setStatementIdentity(parsed.internalIdentity || extractStatementIdentity(rows));
      const effectiveDate = extractStatementEffectiveDate(rows);
      setStatementEffectiveDate(effectiveDate);

      const extractedCash = extractAvailableCash(rows);

      if (!Number.isFinite(extractedCash) || extractedCash < 0) {
        throw new Error(
          "Could not detect available cash. Enter the amount manually below."
        );
      }

      setCash(String(extractedCash));
      setStatus(
        `${file.name} read successfully. Available cash detected: KES ${money(extractedCash)}. ${
          effectiveDate ? `Statement date: ${effectiveDate}.` : "Statement effective date not found."
        }`
      );
    } catch (error) {
      setStatus(`Statement read failed: ${error.message}`);
      Alert.alert("Statement Read Failed", error.message);
    }
  }

  async function parseStatementFile(file) {
    const name = String(file.name || "").toLowerCase();

    if (name.endsWith(".pdf")) {
      const result = await extractBrokerPdf(file, "cash");
      return { rows: requireSafeImportRows(result.rows), internalIdentity: result.identity };
    }

    if (name.endsWith(".csv")) {
      const text = await readFileText(file);

      const workbook = XLSX.read(text, safeWorkbookReadOptions("string"));

      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      return { rows: requireSafeImportRows(XLSX.utils.sheet_to_json(sheet, {
        defval: ""
      })), internalIdentity: null };
    }

    const base64 = await readFileBase64(file);

    const workbook = XLSX.read(base64, safeWorkbookReadOptions("base64"));

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    return { rows: requireSafeImportRows(XLSX.utils.sheet_to_json(sheet, {
      defval: ""
    })), internalIdentity: null };
  }

  async function readFileText(file) {
    if (Platform.OS === "web") {
      // Prefer the browser File supplied by Expo DocumentPicker.
      // Fall back to the picker URI when the File object is unavailable.
      if (file?.file && typeof file.file.text === "function") {
        return await file.file.text();
      }

      const response = await fetch(file.uri);

      if (!response.ok) {
        throw new Error("The selected broker file could not be opened.");
      }

      return await response.text();
    }

    return await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.UTF8
    });
  }

  async function readFileBase64(file) {
    if (Platform.OS === "web") {
      let arrayBuffer;

      // Prefer the browser File supplied by Expo DocumentPicker.
      // Blob/object-URL fetch remains the compatibility fallback.
      if (file?.file && typeof file.file.arrayBuffer === "function") {
        arrayBuffer = await file.file.arrayBuffer();
      } else {
        const response = await fetch(file.uri);

        if (!response.ok) {
          throw new Error("The selected broker file could not be opened.");
        }

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

  function showPracticeFundingFeedback({
    title,
    message,
    requiresPortfolio = false
  }) {
    if (Platform.OS === "web") {
      setPracticeFundingFeedback({
        title,
        message,
        requiresPortfolio
      });
      return true;
    }

    return false;
  }

  async function updatePracticeFunds(
    transactionType
  ) {
    try {
      setPracticeFundingFeedback(null);

      const amount =
        cleanNumber(cash);

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        const title = "Invalid Amount";
        const message =
          "Enter a Practice funding amount greater than zero.";

        if (
          !showPracticeFundingFeedback({
            title,
            message
          })
        ) {
          Alert.alert(title, message);
        }

        return;
      }

      setPracticeLoading(true);

      const context =
        await loadInvestorContext();

      const practice =
        context?.practicePortfolio;

      if (
        !practice ||
        practice?.status !== "ACTIVE"
      ) {
        const title =
          "Practice Portfolio Required";
        const message =
          "Create your Practice Portfolio before adding or withdrawing Practice funds.";

        if (
          !showPracticeFundingFeedback({
            title,
            message,
            requiresPortfolio: true
          })
        ) {
          Alert.alert(title, message);
        }

        return;
      }

      const currentCash =
        Math.max(
          0,
          Number(
            practice?.availableCash ||
            0
          )
        );

      const normalizedType =
        String(
          transactionType ||
          ""
        ).toUpperCase();

      if (
        normalizedType !==
          "PRACTICE_DEPOSIT" &&
        normalizedType !==
          "PRACTICE_WITHDRAWAL"
      ) {
        throw new Error(
          "Unsupported Practice funding transaction."
        );
      }

      if (
        normalizedType ===
          "PRACTICE_WITHDRAWAL" &&
        amount > currentCash
      ) {
        const title =
          "Insufficient Practice Cash";
        const message =
          `Available Practice cash is KES ${money(currentCash)}.`;

        if (
          !showPracticeFundingFeedback({
            title,
            message
          })
        ) {
          Alert.alert(title, message);
        }

        return;
      }

      const nextCash =
        normalizedType ===
          "PRACTICE_DEPOSIT"
          ? currentCash + amount
          : currentCash - amount;

      const now =
        new Date().toISOString();

      const event = {
        id:
          `practice-funding-${Date.now()}`,

        type:
          normalizedType,

        amount:
          Number(
            amount.toFixed(2)
          ),

        previousAvailableCash:
          Number(
            currentCash.toFixed(2)
          ),

        availableCashAfter:
          Number(
            nextCash.toFixed(2)
          ),

        source:
          "GATECEP_PRACTICE_FUNDS",

        isPractice:
          true,

        affectsRealCash:
          false,

        createdAt:
          now
      };

      const historyRaw =
        await userGetItem(
          "practiceFundingEvents"
        );

      let history = [];

      if (historyRaw) {
        try {
          const parsed =
            JSON.parse(historyRaw);

          history =
            Array.isArray(parsed)
              ? parsed
              : [];
        } catch {
          history = [];
        }
      }

      /*
       * Practice cash mutation is canonical only inside
       * practicePortfolio.availableCash.
       *
       * Do not write userStorage["availableCash"].
       * Do not call /user-cash.
       * Do not rebuild the REAL ledger.
       * Do not refresh a REAL portfolio snapshot.
       */
      await savePracticePortfolio({
        ...practice,

        availableCash:
          Number(
            nextCash.toFixed(2)
          ),

        lastActivityType:
          normalizedType,

        lastPracticeFundingAt:
          now
      });

      await userSetItem(
        "practiceFundingEvents",
        JSON.stringify([
          event,
          ...history
        ])
      );

      setPracticeAvailableCash(
        Number(
          nextCash.toFixed(2)
        )
      );

      setCash("");

      const successTitle =
        normalizedType ===
          "PRACTICE_DEPOSIT"
          ? "Practice Deposit Complete"
          : "Practice Withdrawal Complete";

      const successMessage =
        `${
          normalizedType ===
            "PRACTICE_DEPOSIT"
            ? "Deposited"
            : "Withdrew"
        } KES ${money(amount)}. Available Practice cash is now KES ${money(nextCash)}. No real money was moved.`;

      if (
        !showPracticeFundingFeedback({
          title: successTitle,
          message: successMessage
        })
      ) {
        Alert.alert(
          successTitle,
          successMessage
        );
      }
    } catch (error) {
      console.error(
        "Practice funds update failed:",
        error
      );

      const title =
        "Practice Funds Update Failed";
      const message =
        error?.message ||
        "Unable to update Practice funds.";

      if (
        !showPracticeFundingFeedback({
          title,
          message
        })
      ) {
        Alert.alert(title, message);
      }
    } finally {
      setPracticeLoading(false);
    }
  }

  async function saveStatement() {
    if (practiceMode) {
      throw new Error(
        "Practice Funds cannot use the REAL cash statement path."
      );
    }

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
        fileName: selectedFile?.name || null,
        statementEffectiveDate
      };

      if (reconciliationMode) {
        if (!selectedFile) {
          Alert.alert(
            "Cash Evidence Required",
            "Select the broker cash or ledger statement file before confirming reconciliation evidence."
          );
          return;
        }

        const mirror = await loadBrokerMirror();
        if (!mirror?.brokerAccountKey) {
          throw new Error("Upload and verify the broker valuation before cash evidence.");
        }
        const accountIdentity = requireValidBrokerEvidenceIdentity({
          fileName: selectedFile.name,
          userCds: await loadVerifiedUserCds(),
          brokerId: mirror.brokerId,
          clientAccount: mirror.clientAccount || mirror.tradingAccount,
          internalIdentity: statementIdentity,
          expectedAccountKey: mirror.brokerAccountKey
        });

        const verifiedCashEvidence = requireVerifiedBrokerCashEvidence({
          cashBalance: amount,
          statementEffectiveDate,
          accountIdentity
        });

        await attachVerifiedBrokerCashEvidence({
          cashBalance: amount,
          fileName: selectedFile.name,
          broker,
          accountIdentity,
          statementEffectiveDate: verifiedCashEvidence.statementEffectiveDate
        });

        await userSetItem("brokerCashEvidenceUploaded", "true");
        await userSetItem(
          "LatestBrokerCashEvidenceUpload",
          JSON.stringify({
            ...summary,
            source: "BROKER_CASH_RECONCILIATION_EVIDENCE",
            runtimeMode: "REAL_VERIFIED_UPLOAD"
          })
        );

        Alert.alert(
          "Broker Cash Evidence Ready",
          "The matching broker statement is ready. Review and confirm the complete broker snapshot before GateCEP replaces its REAL record."
        );
        router.replace("/portfolio-sync-center");
        return;
      }

      if (connectedRealBroker) {
        Alert.alert(
          "Connected Broker Cash Is Read-only",
          "Use Portfolio Sync Center and verified broker evidence to update this REAL cash balance."
        );
        router.replace("/portfolio-sync-center");
        return;
      }

      await userSetItem("availableCash", String(amount));
      if (selectedFile && statementRows.length) {
        const cashEvents = normalizeBrokerCashStatementEvents(statementRows, {
          fileName: selectedFile.name,
          broker
        });
        await userSetItem("canonicalCashEvidenceEvents", JSON.stringify(cashEvents));
      }
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

      await rebuildCanonicalPortfolioLedger();

      await refreshCanonicalRealPortfolioSnapshot({
        reason: "CASH_STATEMENT_UPDATE"
      });

      Alert.alert("Statement Saved", "Available cash updated.");
      router.replace("/broker-upload");
    } catch (error) {
      Alert.alert("Cash Update Failed", error.message);
      setStatus(`Cash update failed: ${error.message}`);
    }
  }

  if (practiceMode) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>
            Practice Funds
          </Text>

          <Pressable
            style={styles.dashboardButton}
            onPress={() =>
              router.replace(
                "/(tabs)/dashboard"
              )
            }
          >
            <Text
              style={
                styles.dashboardButtonText
              }
            >
              Dashboard
            </Text>
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          Add or withdraw simulated cash for your Practice Portfolio. No real money is moved and no REAL broker balance is changed.
        </Text>

        <View style={styles.statusBox}>
          <Text style={styles.statusText}>
            SIMULATION ONLY — NO REAL MONEY
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Available Practice Cash
          </Text>

          <Text style={styles.practiceCashValue}>
            {practiceLoading
              ? "Loading..."
              : `KES ${money(
                  practiceAvailableCash
                )}`}
          </Text>

          <Text style={styles.help}>
            This is buying power for simulated Practice trades. Deposits and withdrawals are not investment gains or losses.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Practice Funding Amount
          </Text>

          <TextInput
            placeholder="Amount e.g. 20000"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            value={cash}
            onChangeText={setCash}
            style={styles.input}
          />
        </View>

        {Platform.OS === "web" &&
        practiceFundingFeedback ? (
          <View style={styles.practiceFundingFeedbackCard}>
            <Text style={styles.practiceFundingFeedbackTitle}>
              {practiceFundingFeedback.title}
            </Text>

            <Text style={styles.practiceFundingFeedbackText}>
              {practiceFundingFeedback.message}
            </Text>

            {practiceFundingFeedback.requiresPortfolio ? (
              <Pressable
                style={styles.primary}
                onPress={() =>
                  router.push("/starter-plan")
                }
              >
                <Text style={styles.primaryText}>
                  Create / Open Practice Portfolio
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.secondary}
              onPress={() =>
                setPracticeFundingFeedback(null)
              }
            >
              <Text style={styles.secondaryText}>
                Dismiss
              </Text>
            </Pressable>

            {returnToOrdersReview ? (
              <Pressable
                style={styles.backButton}
                onPress={() =>
                  router.replace("/orders-review")
                }
              >
                <Text style={styles.backText}>
                  Back to Orders Review
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Pressable
          style={styles.primary}
          disabled={practiceLoading}
          onPress={() =>
            updatePracticeFunds(
              "PRACTICE_DEPOSIT"
            )
          }
        >
          <Text style={styles.primaryText}>
            Deposit Practice Funds
          </Text>
        </Pressable>

        <Pressable
          style={styles.secondary}
          disabled={practiceLoading}
          onPress={() =>
            updatePracticeFunds(
              "PRACTICE_WITHDRAWAL"
            )
          }
        >
          <Text style={styles.secondaryText}>
            Withdraw Practice Funds
          </Text>
        </Pressable>

        <Pressable
          style={styles.backButton}
          onPress={() =>
            router.replace(
              returnToOrdersReview
                ? "/orders-review"
                : "/(tabs)/dashboard"
            )
          }
        >
          <Text style={styles.backText}>
            {returnToOrdersReview
              ? "Back to Orders Review"
              : "Back to Practice Portfolio"}
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {reconciliationMode ? "Broker Cash Evidence" : "Funds"}
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
          ? "Upload the current broker cash or ledger statement to complete reconciliation. This does not change GateCEP's REAL available cash."
          : "Import or enter your broker cash / ledger statement to calculate available cash for Coach G."}
      </Text>

      {!reconciliationMode && connectedRealBroker ? (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>
            Connected REAL broker cash is read-only here. Update it through verified broker synchronization.
          </Text>
        </View>
      ) : null}

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
          Select a PDF, CSV, or Excel statement from your phone. Gatecep will try to
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

      <Pressable
        style={styles.primary}
        onPress={() => {
          if (!reconciliationMode && connectedRealBroker) {
            router.push("/portfolio-sync-center");
            return;
          }
          saveStatement();
        }}
      >
        <Text style={styles.primaryText}>
          {reconciliationMode
            ? "Confirm Broker Cash Evidence and Compare"
            : connectedRealBroker
              ? "Open Verified Broker Cash Flow"
              : "Save Initial Cash Statement"}
        </Text>
      </Pressable>

      <Pressable
        style={styles.backButton}
        onPress={() =>
          router.replace(
            reconciliationMode ? "/portfolio-sync-center" : "/broker-upload"
          )
        }
      >
        <Text style={styles.backText}>
          {reconciliationMode
            ? "Back to Portfolio Sync Center"
            : "Back to Upload Center"}
        </Text>
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
  practiceFundingFeedbackCard: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,.45)",
    backgroundColor: "rgba(8,145,178,.10)",
    gap: 10
  },

  practiceFundingFeedbackTitle: {
    color: "#67e8f9",
    fontSize: 16,
    fontWeight: "900"
  },

  practiceFundingFeedbackText: {
    color: "#cbd5e1",
    lineHeight: 20
  },

  practiceCashValue: {
    color: "#f8fafc",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 8,
    marginBottom: 8
  },
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { width: "100%", maxWidth: 960, alignSelf: "center", padding: 22, paddingTop: 70, paddingBottom: 128 },
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
    flexWrap: "wrap",
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
