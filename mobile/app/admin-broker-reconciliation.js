import React, {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";

import {
  MobileHeader,
  MobileScreen
} from "../src/components/mobile/MobileUI";

import { useAuth } from "../src/features/auth/hooks/useAuth";

import {
  loadAdminOverview,
  loadAdminReconciliationTargets,
  loadAdminTargetBrokerLinks,
  previewAdminReconciliationEvidence,
  previewAdminReconciliationExecutionEvidence,
  appendAdminReconciliationTransactionHistory,
  commitAdminBrokerReconciliation
} from "../src/features/admin/api/adminApi";


function normalize(value) {
  return String(value || "")
    .trim();
}


function targetLabel(target) {
  const username =
    normalize(target?.username);

  const email =
    normalize(target?.email);

  if (username && email) {
    return `${username} · ${email}`;
  }

  return username || email || "Investor";
}


function brokerLabel(broker) {
  const brokerName =
    normalize(broker?.broker);

  const clientNumber =
    normalize(broker?.clientNumber);

  const cdsNumber =
    normalize(broker?.cdsNumber);

  const identifiers = [
    clientNumber
      ? `Client ${clientNumber}`
      : "",
    cdsNumber
      ? `CDS ${cdsNumber}`
      : ""
  ].filter(Boolean);

  if (identifiers.length) {
    return `${brokerName || "Broker"} · ${identifiers.join(" · ")}`;
  }

  return brokerName || "Broker account";
}


export default function AdminBrokerReconciliation() {
  const {
    accessToken,
    loading: authLoading
  } = useAuth();

  const [
    checkingAccess,
    setCheckingAccess
  ] = useState(true);

  const [
    authorized,
    setAuthorized
  ] = useState(false);

  const [
    loadingTargets,
    setLoadingTargets
  ] = useState(false);

  const [
    loadingBrokers,
    setLoadingBrokers
  ] = useState(false);

  const [
    targets,
    setTargets
  ] = useState([]);

  const [
    selectedTarget,
    setSelectedTarget
  ] = useState(null);

  const [
    brokers,
    setBrokers
  ] = useState([]);

  const [
    selectedBroker,
    setSelectedBroker
  ] = useState(null);

  const [
    error,
    setError
  ] = useState("");

  const [
    valuationEvidenceFile,
    setValuationEvidenceFile
  ] = useState(null);

  const [
    valuationPreview,
    setValuationPreview
  ] = useState(null);

  const [
    cashEvidenceFile,
    setCashEvidenceFile
  ] = useState(null);

  const [
    cashPreview,
    setCashPreview
  ] = useState(null);

  const [
    transactionEvidenceFile,
    setTransactionEvidenceFile
  ] = useState(null);

  const [
    transactionPreview,
    setTransactionPreview
  ] = useState(null);

  const [
    previewingReportType,
    setPreviewingReportType
  ] = useState("");

  const [
    appendingTransactionHistory,
    setAppendingTransactionHistory
  ] = useState(false);

  const [
    transactionAppendError,
    setTransactionAppendError
  ] = useState("");

  const [
    transactionAppendResult,
    setTransactionAppendResult
  ] = useState(null);

  const [
    evidenceError,
    setEvidenceError
  ] = useState("");

  const [
    reconciliationReason,
    setReconciliationReason
  ] = useState("");

  const [
    reconciliationConfirmed,
    setReconciliationConfirmed
  ] = useState(false);

  const [
    committingReconciliation,
    setCommittingReconciliation
  ] = useState(false);

  const [
    commitError,
    setCommitError
  ] = useState("");

  const [
    commitResult,
    setCommitResult
  ] = useState(null);


  const loadTargets =
    useCallback(async () => {
      if (!accessToken) {
        return;
      }

      setLoadingTargets(true);
      setError("");

      try {
        const result =
          await loadAdminReconciliationTargets(
            accessToken
          );

        setTargets(result);
      } catch (loadError) {
        setTargets([]);

        setError(
          loadError?.message ||
            "Investor accounts could not be loaded."
        );
      } finally {
        setLoadingTargets(false);
      }
    }, [accessToken]);


  const verifyAccess =
    useCallback(async () => {
      if (!accessToken) {
        setAuthorized(false);
        setCheckingAccess(false);
        setError(
          "Authentication is required."
        );
        return;
      }

      setCheckingAccess(true);
      setError("");

      try {
        const result =
          await loadAdminOverview(
            accessToken
          );

        const verified =
          result?.admin === true &&
          String(
            result?.user?.role || ""
          )
            .trim()
            .toUpperCase() === "ADMIN";

        setAuthorized(verified);

        if (!verified) {
          setError(
            "Administrator authorization could not be verified."
          );
          return;
        }

        await loadTargets();
      } catch (accessError) {
        setAuthorized(false);

        if (
          accessError?.status === 401
        ) {
          setError(
            "Your authenticated session is no longer valid."
          );
        } else if (
          accessError?.status === 403
        ) {
          setError(
            "This account is not authorized for GateCEP operations."
          );
        } else {
          setError(
            accessError?.message ||
              "Admin access could not be verified."
          );
        }
      } finally {
        setCheckingAccess(false);
      }
    }, [
      accessToken,
      loadTargets
    ]);


  useEffect(() => {
    if (!authLoading) {
      verifyAccess();
    }
  }, [
    authLoading,
    verifyAccess
  ]);


  const chooseTarget =
    useCallback(
      async (target) => {
        if (
          !accessToken ||
          !target?.id
        ) {
          return;
        }

        setSelectedTarget(target);
        setSelectedBroker(null);
        setValuationEvidenceFile(null);
        setValuationPreview(null);
        setCashEvidenceFile(null);
        setCashPreview(null);
        setTransactionEvidenceFile(null);
        setTransactionPreview(null);
        setAppendingTransactionHistory(false);
        setTransactionAppendError("");
        setTransactionAppendResult(null);
        setPreviewingReportType("");
        setEvidenceError("");
        setReconciliationReason("");
        setReconciliationConfirmed(false);
        setCommittingReconciliation(false);
        setCommitError("");
        setCommitResult(null);
        setBrokers([]);
        setLoadingBrokers(true);
        setError("");

        try {
          const result =
            await loadAdminTargetBrokerLinks(
              accessToken,
              target.id
            );

          setSelectedTarget(
            result.target || target
          );

          setBrokers(
            Array.isArray(
              result.brokers
            )
              ? result.brokers
              : []
          );
        } catch (loadError) {
          setBrokers([]);

          setError(
            loadError?.message ||
              "Broker accounts could not be loaded."
          );
        } finally {
          setLoadingBrokers(false);
        }
      },
      [accessToken]
    );


  const chooseBroker =
    useCallback((broker) => {
      setSelectedBroker(broker);
      setValuationEvidenceFile(null);
      setValuationPreview(null);
      setCashEvidenceFile(null);
      setCashPreview(null);
      setTransactionEvidenceFile(null);
      setTransactionPreview(null);
      setPreviewingReportType("");
      setEvidenceError("");
      setReconciliationReason("");
      setReconciliationConfirmed(false);
      setCommittingReconciliation(false);
      setCommitError("");
      setCommitResult(null);
    }, []);


  const pickAndPreviewEvidence =
    useCallback(
      async (reportType) => {
        if (
          !accessToken ||
          !selectedTarget?.id ||
          !selectedBroker?.id
        ) {
          setEvidenceError(
            "Select an investor and broker before uploading evidence."
          );
          return;
        }

        const normalizedReportType =
          normalize(reportType)
            .toLowerCase();

        if (
          normalizedReportType !== "valuation" &&
          normalizedReportType !== "cash"
        ) {
          setEvidenceError(
            "Unsupported reconciliation evidence type."
          );
          return;
        }

        setEvidenceError("");

        try {
          const result =
            await DocumentPicker.getDocumentAsync({
              copyToCacheDirectory: true,
              multiple: false,
              type: [
                "application/pdf",
                "text/csv",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              ]
            });

          if (result.canceled) {
            return;
          }

          const file =
            result.assets?.[0];

          if (!file) {
            throw new Error(
              "No evidence file was selected."
            );
          }

          const name =
            normalize(file.name)
              .toLowerCase();

          const supportedEvidenceFile =
            [
              ".pdf",
              ".csv",
              ".xls",
              ".xlsx"
            ].some((extension) =>
              name.endsWith(extension)
            );

          if (!supportedEvidenceFile) {
            throw new Error(
              "Select a PDF, CSV, XLS, or XLSX broker statement."
            );
          }

          if (
            normalizedReportType === "valuation"
          ) {
            setValuationEvidenceFile(file);
            setValuationPreview(null);
          } else {
            setCashEvidenceFile(file);
            setCashPreview(null);
          }

          setPreviewingReportType(
            normalizedReportType
          );

          const preview =
            await previewAdminReconciliationEvidence({
              accessToken,
              targetUserId:
                selectedTarget.id,
              brokerLinkId:
                selectedBroker.id,
              file,
              reportType:
                normalizedReportType
            });

          if (
            normalizedReportType === "valuation"
          ) {
            setValuationPreview(preview);
          } else {
            setCashPreview(preview);
          }
        } catch (previewError) {
          if (
            normalize(reportType)
              .toLowerCase() === "valuation"
          ) {
            setValuationPreview(null);
          } else {
            setCashPreview(null);
          }

          setEvidenceError(
            previewError?.message ||
              "Broker evidence preview could not be created."
          );
        } finally {
          setPreviewingReportType("");
        }
      },
      [
        accessToken,
        selectedTarget,
        selectedBroker
      ]
    );


  const pickAndPreviewTransactionHistory =
    useCallback(
      async () => {
        if (
          !accessToken ||
          !selectedTarget?.id ||
          !selectedBroker?.id
        ) {
          setEvidenceError(
            "Select an investor and broker before uploading transaction history."
          );
          return;
        }

        setEvidenceError("");

        try {
          const result =
            await DocumentPicker.getDocumentAsync({
              copyToCacheDirectory: true,
              multiple: false,
              type: [
                "application/pdf",
                "text/csv"
              ]
            });

          if (result.canceled) {
            return;
          }

          const file =
            result.assets?.[0];

          if (!file) {
            throw new Error(
              "No transaction history file was selected."
            );
          }

          const name =
            normalize(file.name)
              .toLowerCase();

          const supportedFile =
            [
              ".pdf",
              ".csv"
            ].some((extension) =>
              name.endsWith(extension)
            );

          if (!supportedFile) {
            throw new Error(
              "Select a PDF or CSV transaction history."
            );
          }

          setTransactionEvidenceFile(file);
          setTransactionPreview(null);
          setTransactionAppendError("");
          setTransactionAppendResult(null);
          setPreviewingReportType(
            "transactions"
          );

          const preview =
            await previewAdminReconciliationExecutionEvidence({
              accessToken,
              targetUserId:
                selectedTarget.id,
              brokerLinkId:
                selectedBroker.id,
              file
            });

          setTransactionPreview(preview);
        } catch (previewError) {
          setTransactionPreview(null);

          setEvidenceError(
            previewError?.message ||
              "Transaction history preview could not be created."
          );
        } finally {
          setPreviewingReportType("");
        }
      },
      [
        accessToken,
        selectedTarget,
        selectedBroker
      ]
    );


  const appendTransactionHistory =
    useCallback(
      async () => {
        if (
          !accessToken ||
          !selectedTarget?.id ||
          !selectedBroker?.id ||
          !transactionEvidenceFile
        ) {
          setTransactionAppendError(
            "Select an investor, broker, and transaction history file first."
          );
          return;
        }

        const reviewSummary =
          transactionPreview
            ?.transactionHistory
            ?.reviewSummary;

        const newCount =
          Number(
            reviewSummary?.newCount || 0
          );

        const reviewRequiredCount =
          Number(
            reviewSummary
              ?.reviewRequiredCount || 0
          );

        if (reviewRequiredCount > 0) {
          setTransactionAppendError(
            "Transaction history contains executions that require review. No transactions were added."
          );
          return;
        }

        if (newCount < 1) {
          setTransactionAppendError(
            "There are no new verified transactions to add."
          );
          return;
        }

        if (appendingTransactionHistory) {
          return;
        }

        setAppendingTransactionHistory(true);
        setTransactionAppendError("");
        setTransactionAppendResult(null);

        try {
          const result =
            await appendAdminReconciliationTransactionHistory({
              accessToken,
              targetUserId:
                selectedTarget.id,
              brokerLinkId:
                selectedBroker.id,
              file:
                transactionEvidenceFile
            });

          setTransactionAppendResult(result);

          /*
           * Re-preview the SAME file after append.
           * The server reloads canonical history, so the
           * newly-added rows must now classify EXISTING.
           */
          const refreshedPreview =
            await previewAdminReconciliationExecutionEvidence({
              accessToken,
              targetUserId:
                selectedTarget.id,
              brokerLinkId:
                selectedBroker.id,
              file:
                transactionEvidenceFile
            });

          setTransactionPreview(
            refreshedPreview
          );
        } catch (appendError) {
          setTransactionAppendError(
            appendError?.message ||
              "Transaction history could not be added for the investor."
          );
        } finally {
          setAppendingTransactionHistory(false);
        }
      },
      [
        accessToken,
        selectedTarget,
        selectedBroker,
        transactionEvidenceFile,
        transactionPreview,
        appendingTransactionHistory
      ]
    );


  const commitReconciliation =
    useCallback(
      async () => {
        if (
          !accessToken ||
          !selectedTarget?.id ||
          !selectedBroker?.id
        ) {
          setCommitError(
            "Select an investor and broker before confirming reconciliation."
          );
          return;
        }

        const valuationId =
          normalize(
            valuationPreview
              ?.evidenceReceipt
              ?.id
          );

        const cashId =
          normalize(
            cashPreview
              ?.evidenceReceipt
              ?.id
          );

        const reason =
          normalize(
            reconciliationReason
          );

        const valuationVerified =
          valuationPreview
            ?.identityVerification
            ?.identityVerified === true;

        const cashVerified =
          cashPreview
            ?.identityVerification
            ?.identityVerified === true;

        if (
          !valuationVerified ||
          !valuationId
        ) {
          setCommitError(
            "Verified valuation evidence is required."
          );
          return;
        }

        if (
          !cashVerified ||
          !cashId
        ) {
          setCommitError(
            "Verified cash evidence is required."
          );
          return;
        }

        if (!reason) {
          setCommitError(
            "Enter a reconciliation reason."
          );
          return;
        }

        if (
          reconciliationConfirmed !== true
        ) {
          setCommitError(
            "Explicit confirmation is required."
          );
          return;
        }

        if (committingReconciliation) {
          return;
        }

        setCommittingReconciliation(true);
        setCommitError("");
        setCommitResult(null);

        try {
          const result =
            await commitAdminBrokerReconciliation({
              accessToken,
              targetUserId:
                selectedTarget.id,
              brokerLinkId:
                selectedBroker.id,
              valuationReceiptId:
                valuationId,
              cashReceiptId:
                cashId,
              reason,
              confirmed: true
            });

          setCommitResult(result);

          /*
           * The server consumes both authoritative receipts.
           * Clear the evidence and confirmation state so the
           * same browser state cannot attempt to reuse them.
           */
          setValuationEvidenceFile(null);
          setValuationPreview(null);
          setCashEvidenceFile(null);
          setCashPreview(null);
          setTransactionEvidenceFile(null);
          setTransactionPreview(null);
          setReconciliationReason("");
          setReconciliationConfirmed(false);
        } catch (error) {
          setCommitError(
            error?.message ||
              "Authoritative reconciliation could not be completed."
          );
        } finally {
          setCommittingReconciliation(false);
        }
      },
      [
        accessToken,
        selectedTarget,
        selectedBroker,
        valuationPreview,
        cashPreview,
        reconciliationReason,
        reconciliationConfirmed,
        committingReconciliation
      ]
    );


  const valuationReceiptId =
    normalize(
      valuationPreview
        ?.evidenceReceipt
        ?.id
    );

  const cashReceiptId =
    normalize(
      cashPreview
        ?.evidenceReceipt
        ?.id
    );

  const valuationReady =
    valuationPreview
      ?.identityVerification
      ?.identityVerified === true &&
    Boolean(valuationReceiptId);

  const cashReady =
    cashPreview
      ?.identityVerification
      ?.identityVerified === true &&
    Boolean(cashReceiptId);

  const reconciliationReady =
    Boolean(
      selectedTarget?.id &&
      selectedBroker?.id &&
      valuationReady &&
      cashReady &&
      normalize(reconciliationReason) &&
      reconciliationConfirmed === true &&
      !committingReconciliation
    );


  if (
    authLoading ||
    checkingAccess
  ) {
    return (
      <MobileScreen
        testID="gatecep-admin-broker-reconciliation"
      >
        <MobileHeader
          title="Broker & Data Reconciliation"
          subtitle="Verifying administrative access."
          onBack={() => router.back()}
        />

        <View style={styles.statusCard}>
          <ActivityIndicator />

          <Text style={styles.statusText}>
            Verifying server authorization…
          </Text>
        </View>
      </MobileScreen>
    );
  }


  if (!authorized) {
    return (
      <MobileScreen
        testID="gatecep-admin-broker-reconciliation"
      >
        <MobileHeader
          title="Broker & Data Reconciliation"
          subtitle="Administrative access required."
          onBack={() => router.back()}
          actionLabel="Admin"
          onAction={() =>
            router.replace("/admin")
          }
        />

        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>
            Access unavailable
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={verifyAccess}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              Retry
            </Text>
          </Pressable>
        </View>
      </MobileScreen>
    );
  }


  return (
    <MobileScreen
      testID="gatecep-admin-broker-reconciliation"
    >
      <MobileHeader
        title="Broker & Data Reconciliation"
        subtitle="Support an investor without impersonating their account."
        onBack={() => router.back()}
        actionLabel="Admin"
        onAction={() =>
          router.replace("/admin")
        }
      />

      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>
            Administrative support context
          </Text>

          <Text style={styles.noticeText}>
            You remain authenticated as the
            GateCEP administrator. Select the
            investor account you are supporting,
            then select a broker account owned by
            that investor.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>
                1. Select investor
              </Text>

              <Text style={styles.sectionDetail}>
                Only active USER accounts are
                provided by the administrative
                targeting service.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={loadTargets}
              style={styles.smallButton}
            >
              <Text style={styles.smallButtonText}>
                Refresh
              </Text>
            </Pressable>
          </View>

          {loadingTargets ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator />

              <Text style={styles.statusText}>
                Loading investors…
              </Text>
            </View>
          ) : targets.length === 0 ? (
            <Text style={styles.emptyText}>
              No eligible investor accounts are
              currently available.
            </Text>
          ) : (
            targets.map((target) => {
              const selected =
                selectedTarget?.id ===
                target.id;

              return (
                <Pressable
                  key={target.id}
                  accessibilityRole="button"
                  testID={
                    `admin-reconciliation-target-${target.id}`
                  }
                  onPress={() =>
                    chooseTarget(target)
                  }
                  style={[
                    styles.optionCard,
                    selected &&
                      styles.optionCardSelected
                  ]}
                >
                  <Text style={styles.optionTitle}>
                    {targetLabel(target)}
                  </Text>

                  <Text style={styles.optionMeta}>
                    USER · ACTIVE
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            2. Select broker
          </Text>

          {!selectedTarget ? (
            <Text style={styles.emptyText}>
              Select an investor before loading
              broker accounts.
            </Text>
          ) : (
            <View style={styles.supportingCard}>
              <Text style={styles.supportingLabel}>
                Supporting
              </Text>

              <Text style={styles.supportingValue}>
                {targetLabel(
                  selectedTarget
                )}
              </Text>
            </View>
          )}

          {loadingBrokers ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator />

              <Text style={styles.statusText}>
                Loading target-owned brokers…
              </Text>
            </View>
          ) : selectedTarget &&
            brokers.length === 0 ? (
            <Text style={styles.emptyText}>
              This investor does not currently
              have a linked broker account.
            </Text>
          ) : (
            brokers.map((broker) => {
              const selected =
                selectedBroker?.id ===
                broker.id;

              return (
                <Pressable
                  key={broker.id}
                  accessibilityRole="button"
                  testID={
                    `admin-reconciliation-broker-${broker.id}`
                  }
                  onPress={() =>
                    chooseBroker(
                      broker
                    )
                  }
                  style={[
                    styles.optionCard,
                    selected &&
                      styles.optionCardSelected
                  ]}
                >
                  <Text style={styles.optionTitle}>
                    {brokerLabel(broker)}
                  </Text>

                  <Text style={styles.optionMeta}>
                    {normalize(
                      broker.status
                    ) || "UNKNOWN"}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            3. Reconciliation workspace
          </Text>

          {selectedTarget &&
          selectedBroker ? (
            <View style={styles.readyCard}>
              <Text style={styles.readyTitle}>
                Support context ready
              </Text>

              <Text style={styles.readyText}>
                Investor:{" "}
                {targetLabel(
                  selectedTarget
                )}
              </Text>

              <Text style={styles.readyText}>
                Broker:{" "}
                {brokerLabel(
                  selectedBroker
                )}
              </Text>

              <Text style={styles.readOnlyText}>
                Preview broker evidence against
                this server-validated investor and
                broker context. No portfolio data
                will be changed.
              </Text>

              <View style={styles.evidenceSlot}>
                <Text style={styles.previewTitle}>
                  Valuation evidence
                </Text>

                <Pressable
                  accessibilityRole="button"
                  testID="admin-reconciliation-preview-valuation"
                  disabled={
                    Boolean(previewingReportType)
                  }
                  onPress={() =>
                    pickAndPreviewEvidence(
                      "valuation"
                    )
                  }
                  style={[
                    styles.secondaryButton,
                    Boolean(
                      previewingReportType
                    ) &&
                      styles.buttonDisabled
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>
                    {previewingReportType ===
                    "valuation"
                      ? "Checking valuation…"
                      : "Choose valuation evidence"}
                  </Text>
                </Pressable>

                {valuationEvidenceFile ? (
                  <Text style={styles.fileText}>
                    File:{" "}
                    {valuationEvidenceFile.name ||
                      "valuation evidence"}
                  </Text>
                ) : null}

                {valuationPreview ? (
                  <View style={styles.previewCard}>
                    <Text style={styles.previewText}>
                      Report:{" "}
                      {normalize(
                        valuationPreview
                          ?.extraction
                          ?.reportType
                      ) || "Unknown"}
                    </Text>

                    <Text style={styles.previewText}>
                      Extracted rows:{" "}
                      {Array.isArray(
                        valuationPreview
                          ?.extraction
                          ?.rows
                      )
                        ? valuationPreview
                            .extraction
                            .rows.length
                        : 0}
                    </Text>

                    <Text
                      style={
                        valuationPreview
                          ?.identityVerification
                          ?.identityVerified ===
                        true
                          ? styles.verifiedText
                          : styles.identityBlockedText
                      }
                    >
                      {valuationPreview
                        ?.identityVerification
                        ?.identityVerified ===
                      true
                        ? "Identity verified"
                        : "Identity mismatch or incomplete"}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.evidenceSlot}>
                <Text style={styles.previewTitle}>
                  Cash evidence
                </Text>

                <Pressable
                  accessibilityRole="button"
                  testID="admin-reconciliation-preview-cash"
                  disabled={
                    Boolean(previewingReportType)
                  }
                  onPress={() =>
                    pickAndPreviewEvidence(
                      "cash"
                    )
                  }
                  style={[
                    styles.secondaryButton,
                    Boolean(
                      previewingReportType
                    ) &&
                      styles.buttonDisabled
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>
                    {previewingReportType ===
                    "cash"
                      ? "Checking cash statement…"
                      : "Choose cash evidence"}
                  </Text>
                </Pressable>

                {cashEvidenceFile ? (
                  <Text style={styles.fileText}>
                    File:{" "}
                    {cashEvidenceFile.name ||
                      "cash-statement.pdf"}
                  </Text>
                ) : null}

                {cashPreview ? (
                  <View style={styles.previewCard}>
                    <Text style={styles.previewText}>
                      Report:{" "}
                      {normalize(
                        cashPreview
                          ?.extraction
                          ?.reportType
                      ) || "Unknown"}
                    </Text>

                    <Text style={styles.previewText}>
                      Extracted rows:{" "}
                      {Array.isArray(
                        cashPreview
                          ?.extraction
                          ?.rows
                      )
                        ? cashPreview
                            .extraction
                            .rows.length
                        : 0}
                    </Text>

                    <Text
                      style={
                        cashPreview
                          ?.identityVerification
                          ?.identityVerified ===
                        true
                          ? styles.verifiedText
                          : styles.identityBlockedText
                      }
                    >
                      {cashPreview
                        ?.identityVerification
                        ?.identityVerified ===
                      true
                        ? "Identity verified"
                        : "Identity mismatch or incomplete"}
                    </Text>
                  </View>
                ) : null}
              </View>



              {previewingReportType ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator />

                  <Text style={styles.statusText}>
                    Extracting and verifying
                    broker evidence…
                  </Text>
                </View>
              ) : null}

              {evidenceError ? (
                <View style={styles.evidenceErrorCard}>
                  <Text style={styles.evidenceErrorTitle}>
                    Evidence preview unavailable
                  </Text>

                  <Text style={styles.errorText}>
                    {evidenceError}
                  </Text>
                </View>
              ) : null}

              <View style={styles.commitCard}>
                <Text style={styles.commitTitle}>
                  Authoritative reconciliation
                </Text>

                <Text style={styles.commitDetail}>
                  Verified valuation and cash evidence
                  update authoritative holdings and cash
                  through this reconciliation. Transaction /
                  Lot History is handled separately below
                  and only appends server-verified executions.
                </Text>

                <Text style={styles.commitLabel}>
                  Reconciliation reason
                </Text>

                <TextInput
                  testID="admin-reconciliation-reason"
                  value={reconciliationReason}
                  onChangeText={(value) => {
                    setReconciliationReason(value);
                    setCommitError("");
                    setCommitResult(null);
                  }}
                  editable={!committingReconciliation}
                  multiline
                  placeholder="Why is this broker reconciliation being applied?"
                  placeholderTextColor="#64748b"
                  style={styles.commitInput}
                />

                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked:
                      reconciliationConfirmed
                  }}
                  testID="admin-reconciliation-confirmation"
                  disabled={committingReconciliation}
                  onPress={() => {
                    setReconciliationConfirmed(
                      (current) => !current
                    );
                    setCommitError("");
                    setCommitResult(null);
                  }}
                  style={[
                    styles.confirmationRow,
                    committingReconciliation &&
                      styles.buttonDisabled
                  ]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      reconciliationConfirmed &&
                        styles.checkboxChecked
                    ]}
                  >
                    <Text style={styles.checkboxMark}>
                      {reconciliationConfirmed
                        ? "✓"
                        : ""}
                    </Text>
                  </View>

                  <Text style={styles.confirmationText}>
                    I confirm this will replace the selected
                    investor's authoritative holdings and
                    cash balance using the verified valuation
                    and cash evidence above.
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled:
                      !reconciliationReady
                  }}
                  testID="admin-reconciliation-commit"
                  disabled={!reconciliationReady}
                  onPress={commitReconciliation}
                  style={[
                    styles.commitButton,
                    !reconciliationReady &&
                      styles.buttonDisabled
                  ]}
                >
                  {committingReconciliation ? (
                    <ActivityIndicator />
                  ) : (
                    <Text style={styles.commitButtonText}>
                      Confirm reconciliation
                    </Text>
                  )}
                </Pressable>

                {!valuationReady ||
                !cashReady ? (
                  <Text style={styles.readOnlyText}>
                    Verified valuation and cash receipts are
                    required before confirmation is enabled.
                  </Text>
                ) : null}

                {commitError ? (
                  <View style={styles.evidenceErrorCard}>
                    <Text style={styles.evidenceErrorTitle}>
                      Reconciliation not completed
                    </Text>

                    <Text style={styles.errorText}>
                      {commitError}
                    </Text>
                  </View>
                ) : null}

                {commitResult ? (
                  <View
                    style={styles.commitSuccessCard}
                    testID="admin-reconciliation-success"
                  >
                    <Text style={styles.commitSuccessTitle}>
                      Reconciliation completed
                    </Text>

                    <Text style={styles.previewText}>
                      Holdings updated:{" "}
                      {commitResult?.holdingsCount ?? 0}
                    </Text>

                    <Text style={styles.previewText}>
                      Available cash: KES{" "}
                      {Number(
                        commitResult?.cashBalance ?? 0
                      ).toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }
                      )}
                    </Text>

                    <Text style={styles.previewDetail}>
                      The verified valuation and cash
                      evidence receipts were consumed by
                      the server and the administrative
                      action was recorded in the audit
                      trail.
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.evidenceSlot}>
                <Text style={styles.previewTitle}>
                  Transaction / Lot History
                </Text>

                <Pressable
                  accessibilityRole="button"
                  testID="admin-reconciliation-preview-transactions"
                  disabled={
                    Boolean(previewingReportType)
                  }
                  onPress={
                    pickAndPreviewTransactionHistory
                  }
                  style={[
                    styles.secondaryButton,
                    Boolean(
                      previewingReportType
                    ) &&
                      styles.buttonDisabled
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>
                    {previewingReportType ===
                    "transactions"
                      ? "Checking transaction history…"
                      : "Choose transaction history"}
                  </Text>
                </Pressable>

                {transactionEvidenceFile ? (
                  <Text style={styles.fileText}>
                    File:{" "}
                    {transactionEvidenceFile.name ||
                      "transaction-history"}
                  </Text>
                ) : null}

                {transactionPreview ? (
                  <View style={styles.previewCard}>
                    <Text style={styles.previewText}>
                      Report: Transaction / Lot History
                    </Text>

                    <Text style={styles.previewText}>
                      Pages:{" "}
                      {transactionPreview
                        ?.transactionHistory
                        ?.pageCount ?? 0}
                    </Text>

                    <Text style={styles.previewText}>
                      Extracted rows:{" "}
                      {transactionPreview
                        ?.transactionHistory
                        ?.rowCount ?? 0}
                    </Text>

                    <Text style={styles.previewText}>
                      Broker identity:{" "}
                      {normalize(
                        transactionPreview
                          ?.transactionHistory
                          ?.identity
                          ?.brokerId
                      ) || "Unknown"}
                    </Text>

                    <Text style={styles.previewText}>
                      Client:{" "}
                      {normalize(
                        transactionPreview
                          ?.transactionHistory
                          ?.identity
                          ?.clientCode
                      ) || "Unknown"}
                    </Text>

                    <Text style={styles.previewText}>
                      Trading account:{" "}
                      {normalize(
                        transactionPreview
                          ?.transactionHistory
                          ?.identity
                          ?.tradingAccount
                      ) || "Unknown"}
                    </Text>

                    <Text
                      style={
                        transactionPreview
                          ?.transactionHistory
                          ?.portfolioReadyRows === 0
                          ? styles.verifiedText
                          : styles.identityBlockedText
                      }
                    >
                      Portfolio-ready rows:{" "}
                      {transactionPreview
                        ?.transactionHistory
                        ?.portfolioReadyRows ?? 0}
                    </Text>

                    <Text style={styles.previewText}>
                      New executions:{" "}
                      {transactionPreview
                        ?.transactionHistory
                        ?.reviewSummary
                        ?.newCount ?? 0}
                    </Text>

                    <Text style={styles.previewText}>
                      Already in history:{" "}
                      {transactionPreview
                        ?.transactionHistory
                        ?.reviewSummary
                        ?.existingCount ?? 0}
                    </Text>

                    <Text style={styles.previewText}>
                      Needs review:{" "}
                      {transactionPreview
                        ?.transactionHistory
                        ?.reviewSummary
                        ?.reviewRequiredCount ?? 0}
                    </Text>

                    <Text style={styles.previewText}>
                      Ignored / no execution:{" "}
                      {transactionPreview
                        ?.transactionHistory
                        ?.reviewSummary
                        ?.ignoredCount ?? 0}
                    </Text>

                    <Text style={styles.previewDetail}>
                      Only server-verified NEW executions
                      can be added. Existing and ignored
                      rows are never modified or appended.
                    </Text>

                    {Number(
                      transactionPreview
                        ?.transactionHistory
                        ?.reviewSummary
                        ?.newCount || 0
                    ) === 0 &&
                    Number(
                      transactionPreview
                        ?.transactionHistory
                        ?.reviewSummary
                        ?.existingCount || 0
                    ) > 0 &&
                    Number(
                      transactionPreview
                        ?.transactionHistory
                        ?.reviewSummary
                        ?.reviewRequiredCount || 0
                    ) === 0 ? (
                      <Text
                        style={styles.verifiedText}
                        testID="admin-reconciliation-transactions-current"
                      >
                        All{" "}
                        {transactionPreview
                          ?.transactionHistory
                          ?.reviewSummary
                          ?.existingCount ?? 0}{" "}
                        verified transactions are already in history.
                      </Text>
                    ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled:
                          appendingTransactionHistory ||
                          Number(
                            transactionPreview
                              ?.transactionHistory
                              ?.reviewSummary
                              ?.newCount || 0
                          ) < 1 ||
                          Number(
                            transactionPreview
                              ?.transactionHistory
                              ?.reviewSummary
                              ?.reviewRequiredCount || 0
                          ) > 0
                      }}
                      testID="admin-reconciliation-add-transactions"
                      disabled={
                        appendingTransactionHistory ||
                        Number(
                          transactionPreview
                            ?.transactionHistory
                            ?.reviewSummary
                            ?.newCount || 0
                        ) < 1 ||
                        Number(
                          transactionPreview
                            ?.transactionHistory
                            ?.reviewSummary
                            ?.reviewRequiredCount || 0
                        ) > 0
                      }
                      onPress={
                        appendTransactionHistory
                      }
                      style={[
                        styles.commitButton,
                        (
                          appendingTransactionHistory ||
                          Number(
                            transactionPreview
                              ?.transactionHistory
                              ?.reviewSummary
                              ?.newCount || 0
                          ) < 1 ||
                          Number(
                            transactionPreview
                              ?.transactionHistory
                              ?.reviewSummary
                              ?.reviewRequiredCount || 0
                          ) > 0
                        ) &&
                          styles.buttonDisabled
                      ]}
                    >
                      {appendingTransactionHistory ? (
                        <ActivityIndicator />
                      ) : (
                        <Text style={styles.commitButtonText}>
                          Add{" "}
                          {transactionPreview
                            ?.transactionHistory
                            ?.reviewSummary
                            ?.newCount ?? 0}{" "}
                          Verified Transactions
                        </Text>
                      )}
                    </Pressable>
                    )}

                    {transactionAppendError ? (
                      <View style={styles.evidenceErrorCard}>
                        <Text style={styles.evidenceErrorTitle}>
                          Transaction history not added
                        </Text>

                        <Text style={styles.errorText}>
                          {transactionAppendError}
                        </Text>
                      </View>
                    ) : null}

                    {transactionAppendResult ? (
                      <Text style={styles.verifiedText}>
                        Transaction history processed for
                        the selected investor. The preview
                        above has been refreshed against
                        canonical history.
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>

              <Text style={styles.readOnlyText}>
                Until Confirm reconciliation succeeds,
                evidence shown on this screen remains a
                preview and no portfolio changes are made.
              </Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>
              Select both an investor and one of
              that investor's broker accounts to
              establish the administrative
              reconciliation context.
            </Text>
          )}
        </View>
      </ScrollView>
    
      <View
        style={{
          marginTop: 14,
          marginBottom: 14,
          padding: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "rgba(245,158,11,.35)",
          backgroundColor: "rgba(245,158,11,.08)"
        }}
        testID="admin-txhist-maintenance-entry"
      >
        <Text
          style={{
            color: "#fcd34d",
            fontSize: 16,
            fontWeight: "900"
          }}
        >
          Transaction History Maintenance
        </Text>

        <Text
          style={{
            color: "#fde68a",
            fontSize: 12,
            lineHeight: 18,
            marginTop: 7
          }}
        >
          Generate and review a server-side broker
          Transaction History backup before controlled
          administrative recovery.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push(
              "/admin-transaction-history-maintenance"
            )
          }
          style={({ pressed }) => ({
            minHeight: 46,
            alignSelf: "flex-start",
            justifyContent: "center",
            marginTop: 13,
            paddingHorizontal: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#f59e0b",
            opacity: pressed ? 0.75 : 1
          })}
          testID="open-admin-txhist-maintenance"
        >
          <Text
            style={{
              color: "#fcd34d",
              fontWeight: "900"
            }}
          >
            Open Maintenance
          </Text>
        </Pressable>
      </View>

</MobileScreen>
  );
}


const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
    gap: 16
  },

  statusCard: {
    padding: 18,
    gap: 10,
    alignItems: "center"
  },

  statusText: {
    fontSize: 14,
    color: "#cbd5e1"
  },

  noticeCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#d7dce3",
    borderRadius: 14,
    gap: 6
  },

  noticeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc"
  },

  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#cbd5e1"
  },

  section: {
    gap: 10
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },

  sectionHeaderText: {
    flex: 1,
    gap: 4
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f8fafc"
  },

  sectionDetail: {
    fontSize: 13,
    lineHeight: 18,
    color: "#94a3b8"
  },

  optionCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#d7dce3",
    borderRadius: 12,
    gap: 4
  },

  optionCardSelected: {
    borderWidth: 2
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f8fafc"
  },

  optionMeta: {
    fontSize: 12,
    color: "#94a3b8"
  },

  supportingCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#d7dce3",
    borderRadius: 10,
    gap: 3
  },

  supportingLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8"
  },

  supportingValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f8fafc"
  },

  readyCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#d7dce3",
    borderRadius: 14,
    gap: 6
  },

  readyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc"
  },

  readyText: {
    fontSize: 14,
    color: "#e2e8f0"
  },

  readOnlyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#94a3b8"
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#94a3b8"
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8
  },

  errorCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#d7dce3",
    borderRadius: 14,
    gap: 10
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc"
  },

  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#fecaca"
  },

  secondaryButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#c7ccd4",
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 9
  },

  secondaryButtonText: {
    fontWeight: "600",
    color: "#67e8f9"
  },

  smallButton: {
    borderWidth: 1,
    borderColor: "#c7ccd4",
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 7
  },

  smallButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#67e8f9"
  },

  buttonDisabled: {
    opacity: 0.55
  },

  fileText: {
    fontSize: 12,
    color: "#cbd5e1"
  },

  evidenceSlot: {
    marginTop: 14
  },

  previewCard: {
    marginTop: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#d7dce3",
    borderRadius: 12,
    gap: 6
  },

  previewTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f8fafc"
  },

  previewText: {
    fontSize: 13,
    color: "#e2e8f0"
  },

  previewDetail: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#cbd5e1"
  },

  verifiedCard: {
    marginTop: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 9
  },

  verifiedText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#86efac"
  },

  identityBlockedCard: {
    marginTop: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 9
  },

  identityBlockedText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fecaca"
  },

  evidenceErrorCard: {
    marginTop: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 9,
    gap: 4
  },

  evidenceErrorTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fecaca"
  },

  commitCard: {
    marginTop: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d7dce3",
    borderRadius: 12,
    gap: 12
  },

  commitTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc"
  },

  commitDetail: {
    fontSize: 13,
    lineHeight: 18,
    color: "#cbd5e1"
  },

  commitLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#e2e8f0"
  },

  commitInput: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: "#c7ccd4",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f8fafc",
    textAlignVertical: "top"
  },

  confirmationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },

  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: "#c7ccd4",
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center"
  },

  checkboxChecked: {
    borderColor: "#86efac"
  },

  checkboxMark: {
    fontSize: 15,
    fontWeight: "700",
    color: "#86efac"
  },

  confirmationText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#e2e8f0"
  },

  commitButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 9,
    paddingHorizontal: 16,
    paddingVertical: 10
  },

  commitButtonText: {
    fontWeight: "700",
    color: "#86efac"
  },

  commitSuccessCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 9,
    gap: 6
  },

  commitSuccessTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#86efac"
  }
});
