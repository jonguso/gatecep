import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system/legacy";
import {
  requireSafeImportFile,
  requireSafeImportRows,
  safeWorkbookReadOptions
} from "../src/security/importFileSecurity";
import { router, useLocalSearchParams } from "expo-router";

import ActiveUserBanner from "../src/components/ActiveUserBanner";
import { userSetItem } from "../src/auth/userStorage";
import {
  loadBrokerAccounts
} from "../src/services/brokers/brokerAccountStore";
import {
  buildBrokerAccountKey,
  extractOrderHistoryIdentity,
  loadVerifiedUserCds,
  requireValidBrokerEvidenceIdentity
} from "../src/features/broker-sync/brokerEvidenceIdentityService";
import {
  loadBrokerTransactionHistoryEvidence,
  resetBrokerTransactionHistoryEvidence,
  saveBrokerTransactionHistoryEvidence
} from "../src/features/trading/brokerTransactionHistoryEvidenceStore";
import {
  reviewBrokerTransactionUpload
} from "../src/features/trading/brokerTransactionUploadReviewService";
import {
  appendCanonicalBrokerTransactionHistory,
  resolveAndLoadCanonicalBrokerTransactionHistory
} from "../src/features/transactions/api/transactionHistoryApi";
import {
  mapVerifiedHistoryBatchForServer
} from "../src/features/transactions/api/transactionHistoryCanonicalMapper";
import {
  classifyCanonicalHistoryAuthority,
  requireCanonicalAppendAuthority,
  requireVerifiedAppendBatch
} from "../src/features/transactions/transactionHistoryCanonicalPersistencePolicy";
import { buildSyncStatus } from "../src/portfolio/syncStatus";
import { rebuildCanonicalPortfolioLedger } from "../src/features/trading/canonicalPortfolioLedgerService";
import {
  partitionHistoricalBrokerExecutionEvidence
} from "../src/features/trading/historicalBrokerExecutionEvidencePolicy";
import { ContainedPanel } from "../src/components/mobile/MobileUI";
import { extractBrokerPdf } from "../src/services/brokers/brokerPdfExtractionApi";
import { reconcileUncertainRealOrderFromVerifiedEvidence } from "../src/features/broker-sync/realOrderExecutionEvidenceReconciliationService";

// PC-030M20AV3D RESPONSIVE CALIBRATION
export default function TransactionsUpload() {
  const { width: av3dWidth } = useWindowDimensions();
  const params = useLocalSearchParams();

  const recoveryOrderId = String(
    params?.recoveryOrderId || ""
  ).trim();

  const recoverySymbol = String(
    params?.recoverySymbol || ""
  ).trim().toUpperCase();

  const recoveryBrokerId = String(
    params?.recoveryBrokerId || ""
  ).trim().toUpperCase();

  const requestedBrokerAccountKey = String(
    params?.brokerAccountKey || ""
  ).trim().toUpperCase();

  const [selectedFile, setSelectedFile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [rawEvidenceRows, setRawEvidenceRows] = useState([]);
  const [uploadReview, setUploadReview] = useState(null);
const [evidenceInternalIdentity, setEvidenceInternalIdentity] = useState(null);
  const [selectedBrokerAccount, setSelectedBrokerAccount] = useState(null);
  const [accountResolutionReady, setAccountResolutionReady] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;

    async function resolveBrokerAccount() {
      try {
        setAccountResolutionReady(false);

        if (!requestedBrokerAccountKey) {
          if (active) {
            setSelectedBrokerAccount(null);
            setAccountResolutionReady(true);
          }
          return;
        }

        const accounts = await loadBrokerAccounts();

        const matched = accounts.find((account) => {
          const accountKey = buildBrokerAccountKey({
            brokerId: account.brokerId,
            clientAccount:
              account.clientNumber ||
              account.accountNumber,
            tradingAccount:
              account.tradingAccount
          });

        
  return (
            String(accountKey || "")
              .trim()
              .toUpperCase() ===
            requestedBrokerAccountKey
          );
        });

        if (!matched) {
          throw new Error(
            "The selected broker account is not connected to this GateCEP profile."
          );
        }

        if (active) {
          setSelectedBrokerAccount(matched);
          setAccountResolutionReady(true);
        }
      } catch (error) {
        if (active) {
          setSelectedBrokerAccount(null);
          setAccountResolutionReady(true);
          setStatus(
            `Broker account unavailable: ${error.message}`
          );
        }
      }
    }

    resolveBrokerAccount();

    return () => {
      active = false;
    };
  }, [requestedBrokerAccountKey]);

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

      const parsed = await parseFile(file);
      const rows = parsed.rows;

      if (!rows.length) {
        throw new Error(
          "The selected broker transaction file contains no readable rows."
        );
      }

      if (!requestedBrokerAccountKey) {
        throw new Error(
          "Choose the connected broker account before reviewing transaction history."
        );
      }

      /*
       * R7O-R4E7R21A
       *
       * Canonical server Transaction History is the duplicate
       * authority. Local Transaction History is only a cache.
       *
       * An established-but-empty canonical authority represents
       * physical history deletion, including Admin Clear. In that
       * state only the selected broker account's stale local cache
       * is invalidated before duplicate review.
       *
       * A never-established authority is NOT proof of deletion and
       * therefore must fail closed without erasing local evidence.
       */

      if (!selectedBrokerAccount) {
        throw new Error(
          "The selected broker account is not ready for canonical Transaction History review."
        );
      }

      const canonicalReviewResolution =
        await resolveAndLoadCanonicalBrokerTransactionHistory({
          brokerAccount:
            selectedBrokerAccount,
          brokerAccountKey:
            requestedBrokerAccountKey
        });

      const canonicalReviewAuthority =
        classifyCanonicalHistoryAuthority(
          canonicalReviewResolution.canonical
        );

      if (
        canonicalReviewAuthority.state ===
        "AUTHORITY_NOT_ESTABLISHED"
      ) {
        throw new Error(
          "Canonical Transaction History authority is not established for this broker account."
        );
      }

      if (
        canonicalReviewAuthority.state ===
        "AUTHORITY_ESTABLISHED_EMPTY"
      ) {
        await resetBrokerTransactionHistoryEvidence({
          brokerAccountKey:
            requestedBrokerAccountKey
        });
      }

      const canonicalExistingHistory =
        Array.isArray(
          canonicalReviewResolution
            ?.canonical
            ?.history
        )
          ? canonicalReviewResolution
              .canonical
              .history
          : [];

      const review =
        reviewBrokerTransactionUpload({
          rawRows: rows,
          brokerAccountKey:
            requestedBrokerAccountKey,

          /*
           * Canonical history is authoritative for immutable
           * Exchange Order duplicate identity.
           *
           * Do not mix stale local cache rows back into this
           * decision.
           */
          existingVerified:
            canonicalExistingHistory,
          existingUnverified:
            []
        });

      setRawEvidenceRows(rows);

      setEvidenceInternalIdentity(
        parsed.internalIdentity ||
          extractOrderHistoryIdentity(rows)
      );

      setUploadReview(review);

      /*
       * Only NEW completed executions become save candidates.
       *
       * EXISTING:
       *   immutable and skipped.
       *
       * NEEDS_REVIEW:
       *   blocks upload.
       *
       * IGNORED:
       *   does not enter historical execution evidence.
       */
      setTransactions(review.newRows);

      setStatus(
        `${review.summary.uploadedCount} rows reviewed: ` +
        `${review.summary.newCount} new, ` +
        `${review.summary.existingCount} existing, ` +
        `${review.summary.reviewRequiredCount} need review, ` +
        `${review.summary.ignoredCount} ignored.`
      );
    } catch (error) {
      setRawEvidenceRows([]);
      setEvidenceInternalIdentity(null);
      setTransactions([]);
      setUploadReview(null);
      setStatus(`Upload failed: ${error.message}`);
      Alert.alert("Upload Failed", error.message);
    }
  }

  async function parseFile(file) {
    const name = String(file.name || "").toLowerCase();

    if (name.endsWith(".pdf")) {
      const result = await extractBrokerPdf(file, "orders");
      const rows = requireSafeImportRows(result.rows);

      return {
        rows,
        internalIdentity:
          result.identity ||
          extractOrderHistoryIdentity(rows)
      };
    }

    if (name.endsWith(".csv")) {
      const text = await readFileText(file);

      const workbook = XLSX.read(text, safeWorkbookReadOptions("string"));

      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const rows = requireSafeImportRows(
        XLSX.utils.sheet_to_json(sheet, {
          defval: ""
        })
      );

      return {
        rows,
        internalIdentity: extractOrderHistoryIdentity(rows)
      };
    }

    const base64 = await readFileBase64(file);

    const workbook = XLSX.read(base64, safeWorkbookReadOptions("base64"));

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = requireSafeImportRows(
      XLSX.utils.sheet_to_json(sheet, {
        defval: ""
      })
    );

    return {
      rows,
      internalIdentity: extractOrderHistoryIdentity(rows)
    };
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
    try {
      if (!uploadReview) {
        Alert.alert(
          "No Review",
          "Select and review a broker transaction file first."
        );
        return;
      }

      if (uploadReview.summary.reviewRequiredCount > 0) {
        Alert.alert(
          "Review Required",
          `${uploadReview.summary.reviewRequiredCount} transaction ` +
          `row${uploadReview.summary.reviewRequiredCount === 1 ? "" : "s"} ` +
          `must be corrected before this file can be added to history.`
        );
        return;
      }

      if (!transactions.length) {
        Alert.alert(
          "No New Transactions",
          uploadReview.summary.existingCount > 0
            ? "All valid executions in this file already exist in transaction history. Existing records were not changed."
            : "This file contains no new completed broker executions to add."
        );
        return;
      }

    if (!requestedBrokerAccountKey) {
      Alert.alert(
        "Broker Account Required",
        "Choose the connected broker account this transaction history belongs to before saving evidence."
      );
      return;
    }

    if (!accountResolutionReady || !selectedBrokerAccount) {
      Alert.alert(
        "Broker Account Unavailable",
        "The selected broker account could not be verified against your connected GateCEP accounts."
      );
      return;
    }

    const userCds = await loadVerifiedUserCds();

    const identityResult =
      requireValidBrokerEvidenceIdentity({
        fileName: selectedFile?.name || "",
        userCds,
        brokerId: selectedBrokerAccount.brokerId,
        clientAccount:
          selectedBrokerAccount.clientNumber ||
          selectedBrokerAccount.accountNumber,
        tradingAccount:
          selectedBrokerAccount.tradingAccount,
        internalIdentity:
          evidenceInternalIdentity ||
          extractOrderHistoryIdentity(rawEvidenceRows),
        expectedAccountKey: requestedBrokerAccountKey
      });

    /*
     * Historical broker transaction history is intentionally
     * separate from GateCEP-originated REAL trade evidence.
     *
     * verified:
     *   execution confirmed and FIFO-ready.
     *
     * needsReview:
     *   execution confirmed, but human correction/evidence is
     *   still required before FIFO may consume it.
     *
     * ignored:
     *   no Total Traded Quantity, therefore no historical
     *   execution. These rows are NOT persisted as transaction
     *   execution evidence.
     */
    const historicalPartition =
      partitionHistoricalBrokerExecutionEvidence(
        transactions,
        {
          brokerAccountKey:
            requestedBrokerAccountKey,
          brokerId:
            selectedBrokerAccount?.brokerId || ""
        }
      );

    const verified =
      historicalPartition.verified;

    const unverified =
      historicalPartition.needsReview;

    const ignoredHistoricalRows =
      historicalPartition.ignored;

    const needsPriceReview =
      historicalPartition.needsPrice;

    /*
     * R7O-R4E7R20
     *
     * Canonical Transaction History is authoritative.
     *
     * Persistence order:
     *   1. Resolve authenticated server broker link.
     *   2. Read canonical authority.
     *   3. Require established append authority.
     *   4. Map VERIFIED/FIFO-ready executions only.
     *   5. Append to canonical server history.
     *   6. Only after canonical success update local cache.
     *
     * Admin-clear local invalidation is intentionally NOT
     * enabled in R20.
     */

    if (unverified.length > 0) {
      throw new Error(
        "Transaction History contains execution evidence that still requires review."
      );
    }

    if (verified.length === 0) {
      throw new Error(
        "No verified completed broker executions are available for canonical Transaction History."
      );
    }

    const canonicalResolution =
      await resolveAndLoadCanonicalBrokerTransactionHistory({
        account: selectedBrokerAccount,
        brokerAccountKey:
          identityResult.brokerAccountKey
      });

    const canonicalAuthority =
      requireCanonicalAppendAuthority(
        canonicalResolution.canonical
      );

    const canonicalExecutions =
      mapVerifiedHistoryBatchForServer(
        verified,
        {
          brokerAccountKey:
            identityResult.brokerAccountKey,
          sourceFileName:
            selectedFile?.name || null
        }
      );

    requireVerifiedAppendBatch(
      canonicalExecutions
    );

    const canonicalAppendResult =
      await appendCanonicalBrokerTransactionHistory({
        brokerLinkId:
          canonicalResolution.brokerLink.brokerLinkId,
        observedGeneration:
          canonicalAuthority.observedGeneration,
        executions:
          canonicalExecutions
      });

    if (
      Number(
        canonicalAppendResult.insertedCount
      ) +
        Number(
          canonicalAppendResult.existingCount
        ) !==
      canonicalExecutions.length
    ) {
      throw new Error(
        "Canonical Transaction History append did not account for every submitted execution."
      );
    }

    const savedEvidence =
      await saveBrokerTransactionHistoryEvidence({
        brokerAccountKey: identityResult.brokerAccountKey,
        verified,
        unverified,
        fileName: selectedFile?.name || null,
        source: "TRANSACTION_UPLOAD"
      });

    const mergeSummary =
      savedEvidence?.mergeSummary || {};

    const newVerifiedCount =
      Number(mergeSummary.insertedVerifiedCount || 0);

    const newUnverifiedCount =
      Number(mergeSummary.insertedUnverifiedCount || 0);

    const newAddedCount =
      newVerifiedCount + newUnverifiedCount;

    const existingSkippedCount =
      Number(mergeSummary.skippedExistingCount || 0);

    const ignoredCount =
      Number(mergeSummary.skippedInvalidCount || 0);

    await userSetItem(
      "transactionsUploaded",
      savedEvidence.verified.length ? "true" : "false"
    );

    await userSetItem(
      "transactionUploadSummary",
      JSON.stringify({
        count: newVerifiedCount,
        newAddedCount,
        newVerifiedCount,
        newUnverifiedCount,
        existingSkippedCount,
        ignoredCount,
        updatedExistingCount:
          Number(mergeSummary.updatedExistingCount || 0),
        deletedCount:
          Number(mergeSummary.deletedCount || 0),
        submittedVerifiedCount: verified.length,
        submittedUnverifiedCount: unverified.length,

        /*
         * Historical execution review metadata.
         */
        needsReviewCount: unverified.length,
        needsPriceReviewCount: needsPriceReview.length,
        ignoredNoExecutionCount:
          ignoredHistoricalRows.length,

        /*
         * Kept for compatibility with existing summary readers.
         */
        rejectedCount: unverified.length,

        fileName: selectedFile?.name || null,
        brokerAccountKey: identityResult.brokerAccountKey,
        brokerId: selectedBrokerAccount.brokerId,
        clientNumber:
          selectedBrokerAccount.clientNumber ||
          selectedBrokerAccount.accountNumber ||
          null,
        uploadedAt: new Date().toISOString()
      })
    );

    await rebuildCanonicalPortfolioLedger();
    await buildSyncStatus();

    let recoveryResult = null;

    if (recoveryOrderId) {
      recoveryResult =
        await reconcileUncertainRealOrderFromVerifiedEvidence({
          orderId: recoveryOrderId,
          records: savedEvidence.verified,
          expectedBrokerAccountKey:
            savedEvidence.brokerAccountKey
        });
    }

    if (
      recoveryResult?.status ===
      "AMBIGUOUS_VERIFIED_MATCH"
    ) {
      Alert.alert(
        "Evidence Saved — Match Ambiguous",
        `${newAddedCount} new broker executions were added; ${existingSkippedCount} existing executions were skipped. ${recoveryResult.matchCount} records could match the uncertain REAL order. GateCEP did not guess. The order remains locked for reconciliation.`,
        [
          {
            text: "Review Recovery",
            onPress: () =>
              router.replace("/real-order-recovery")
          }
        ]
      );

      return;
    }

    if (
      recoveryResult?.status ===
      "NO_VERIFIED_MATCH"
    ) {
      Alert.alert(
        "Evidence Saved — No Unique Match",
        `${newAddedCount} new broker executions were added; ${existingSkippedCount} existing executions were skipped, but none uniquely matched the uncertain REAL order${recoverySymbol ? ` ${recoverySymbol}` : ""}${recoveryBrokerId ? ` at ${recoveryBrokerId}` : ""}. The order remains locked.`,
        [
          {
            text: "Review Recovery",
            onPress: () =>
              router.replace("/real-order-recovery")
          }
        ]
      );

      return;
    }

    if (
      recoveryResult?.status ===
      "VERIFIED_EXECUTION_QUANTITY_EXCEEDS_ORDER"
    ) {
      Alert.alert(
        "Evidence Saved - Quantity Conflict",
        "Verified broker execution quantity exceeds the GateCEP order quantity. GateCEP saved the broker evidence but did not mutate the OMS order. Review the broker statement and recovery state before taking further action.",
        [
          {
            text: "Review Recovery",
            onPress: () =>
              router.replace("/real-order-recovery")
          }
        ]
      );

      return;
    }

    if (
      recoveryResult?.status ===
      "RECONCILIATION_PERSISTENCE_FAILED"
    ) {
      Alert.alert(
        "Evidence Saved — Recovery Not Persisted",
        "The verified broker execution evidence was saved and uniquely matched the uncertain REAL order, but GateCEP could not persist the OMS recovery state. The order remains locked. Do not resubmit the order; review recovery before taking further action.",
        [
          {
            text: "Review Recovery",
            onPress: () =>
              router.replace("/real-order-recovery")
          }
        ]
      );

      return;
    }

    if (recoveryResult?.resolved === true) {
      const partial =
        recoveryResult?.status ===
        "PARTIAL_FILL_FROM_VERIFIED_BROKER_EXECUTION";

      Alert.alert(
        partial
          ? "REAL Order Partially Reconciled"
          : "REAL Order Reconciled",
        partial
          ? "Verified broker execution evidence confirms a partial REAL fill. GateCEP updated only the genuinely executed quantity and kept the remaining quantity open for further reconciliation."
          : "Verified broker execution evidence fully reconciled the REAL order. No manual fill was created.",
        [
          {
            text: "Review Recovery",
            onPress: () =>
              router.replace("/real-order-recovery")
          }
        ]
      );

      return;
    }

    Alert.alert(
      "Evidence Reviewed",
      `${newAddedCount} new broker execution${newAddedCount === 1 ? "" : "s"} added; ${existingSkippedCount} existing execution${existingSkippedCount === 1 ? "" : "s"} skipped; ${ignoredCount} invalid execution${ignoredCount === 1 ? "" : "s"} ignored. Existing records modified: 0. Existing records deleted: 0.`
    );

    router.replace("/portfolio-sync-center");
    } catch (error) {
      const message =
        error?.message ||
        "GateCEP could not validate or save this broker evidence.";

      setStatus(`Evidence rejected: ${message}`);
      Alert.alert("Broker Evidence Rejected", message);
    }
  }


  return (
    <ScrollView style={styles.screen} contentContainerStyle={[
      styles.content,
      av3dWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
      av3dWidth < 720 && { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 },
      av3dWidth < 480 && { paddingHorizontal: 12, paddingTop: 24 }
    ]}>
      <View style={[styles.headerRow, av3dWidth < 600 && { flexDirection: "column", alignItems: "stretch" }]}>
        <Text style={[
      styles.title,
      av3dWidth < 720 && { fontSize: 28, lineHeight: 34 },
      av3dWidth < 480 && { fontSize: 25, lineHeight: 31 }
    ]}>Broker Execution Upload</Text>

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
          Historical execution authority: Exchange Order No, Total Traded
          Quantity, execution date, security, Buy or Sell, and explicit broker
          execution price. Order Status is descriptive only. Order Quantity and
          Traded Quantity do not prove execution.
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

      <ContainedPanel
        title="Transaction History Review"
        subtitle={
          uploadReview
            ? `${uploadReview.summary.uploadedCount} broker rows reviewed`
            : "Select a broker transaction file to review"
        }
        emptyMessage="No transactions loaded yet."
        testID="broker-execution-preview-panel"
      >
        {uploadReview ? (
          <>
            <Text style={styles.body}>
              New executions: {uploadReview.summary.newCount}
            </Text>

            <Text style={styles.body}>
              Already in history: {uploadReview.summary.existingCount}
            </Text>

            <Text style={styles.body}>
              Needs review: {uploadReview.summary.reviewRequiredCount}
            </Text>

            <Text style={styles.body}>
              Ignored / no execution: {uploadReview.summary.ignoredCount}
            </Text>

            <Text style={styles.body}>
              Existing transactions modified: 0
            </Text>

            <Text style={styles.body}>
              Existing transactions deleted: 0
            </Text>

            {uploadReview.reviewRows.length > 0 ? (
              <View style={styles.reviewWarning}>
                <Text style={styles.reviewWarningTitle}>
                  Review Required
                </Text>

                {uploadReview.reviewRows.slice(0, 10).map((tx) => (
                  <View
                    key={`REVIEW-${tx.sourceIndex}`}
                    style={styles.reviewItem}
                  >
                    <Text style={styles.symbol}>
                      {tx.symbol || "Unknown security"}
                    </Text>

                    <Text style={styles.small}>
                      Exchange Order: {tx.exchangeOrderNo || "Missing"}
                    </Text>

                    <Text style={styles.small}>
                      {tx.status || "UNKNOWN"} • Traded Qty {tx.totalTradedQuantity || 0}
                    </Text>

                    <Text style={styles.reviewReason}>
                      {tx.reviewReasons.join(", ")}
                    </Text>
                  </View>
                ))}

                {uploadReview.reviewRows.length > 10 ? (
                  <Text style={styles.more}>
                    + {uploadReview.reviewRows.length - 10} more rows requiring review
                  </Text>
                ) : null}
              </View>
            ) : null}

            {transactions.length > 0 ? (
              <View style={styles.newSection}>
                <Text style={styles.reviewSectionTitle}>
                  New Executions to Add
                </Text>

                {transactions.slice(0, 10).map((tx) => (
                  <View
                    key={tx.id}
                    style={[
                      styles.row,
                      av3dWidth < 520 && {
                        flexDirection: "column"
                      }
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.symbol}>
                        {tx.symbol}
                      </Text>

                      <Text style={styles.small}>
                        {tx.date} • {tx.side} • Traded Qty {tx.totalTradedQuantity}
                      </Text>

                      <Text style={styles.small}>
                        {tx.status} • Exchange Order {tx.exchangeOrderNo}
                      </Text>
                    </View>

                    <View
                      style={{
                        alignItems:
                          av3dWidth < 520
                            ? "flex-start"
                            : "flex-end"
                      }}
                    >
                      <Text style={styles.value}>
                        KES {money(tx.value)}
                      </Text>

                      <Text style={styles.small}>
                        @ {money(tx.price)}
                      </Text>
                    </View>
                  </View>
                ))}

                {transactions.length > 10 ? (
                  <Text style={styles.more}>
                    + {transactions.length - 10} more new executions
                  </Text>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}
      </ContainedPanel>

      <Pressable
        style={[
          styles.primary,
          uploadReview?.summary?.reviewRequiredCount > 0 &&
            styles.primaryDisabled
        ]}
        disabled={
          !uploadReview ||
          uploadReview.summary.reviewRequiredCount > 0 ||
          transactions.length === 0
        }
        onPress={saveTransactions}
      >
        <Text style={styles.primaryText}>
          {uploadReview?.summary?.reviewRequiredCount > 0
            ? "Resolve Review Items Before Upload"
            : transactions.length > 0
            ? `Add ${transactions.length} New Transaction${transactions.length === 1 ? "" : "s"}`
            : "No New Transactions to Add"}
        </Text>
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

  reviewWarning: {
    marginTop: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#92400e",
    borderRadius: 14,
    backgroundColor: "#451a03"
  },

  reviewWarningTitle: {
    color: "#fbbf24",
    fontWeight: "900",
    marginBottom: 8
  },

  reviewItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#78350f"
  },

  reviewReason: {
    color: "#fbbf24",
    fontSize: 12,
    marginTop: 4
  },

  reviewSectionTitle: {
    color: "#67e8f9",
    fontWeight: "900",
    marginBottom: 8
  },

  newSection: {
    marginTop: 20
  },

  primaryDisabled: {
    opacity: 0.45
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
