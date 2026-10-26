import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  router
} from "expo-router";

import {
  MobileHeader,
  MobileScreen
} from "../src/components/mobile/MobileUI";

import {
  AdminAccessGate
} from "../src/features/admin/components/AdminAccessGate";

import {
  useAdminAuthorization
} from "../src/features/admin/hooks/useAdminAuthorization";

import {
  loadAdminReconciliationTargets,
  loadAdminTargetBrokerLinks,
  loadAdminBrokerTransactionHistoryBackup,
  resetAdminBrokerTransactionHistory
} from "../src/features/admin/api/adminApi";

function clean(value) {
  return String(value ?? "").trim();
}

function targetLabel(target) {
  return (
    clean(target?.email) ||
    clean(target?.username) ||
    clean(target?.name) ||
    clean(target?.id) ||
    "Investor"
  );
}

function brokerLabel(broker) {
  const brokerName =
    clean(
      broker?.broker ||
      broker?.brokerName ||
      broker?.provider
    );

  const clientNumber =
    clean(
      broker?.clientNumber ||
      broker?.accountNumber
    );

  if (brokerName && clientNumber) {
    return `${brokerName} • ${clientNumber}`;
  }

  return (
    brokerName ||
    clientNumber ||
    clean(broker?.id) ||
    "Broker account"
  );
}

function SelectCard({
  title,
  detail,
  selected,
  disabled,
  onPress,
  testID
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.selectCard,
        selected &&
          styles.selectCardSelected,
        disabled &&
          styles.disabled,
        pressed &&
          !disabled &&
          styles.pressed
      ]}
    >
      <View style={styles.selectCopy}>
        <Text style={styles.selectTitle}>
          {title}
        </Text>

        {detail ? (
          <Text style={styles.selectDetail}>
            {detail}
          </Text>
        ) : null}
      </View>

      <Text style={styles.selectIndicator}>
        {selected ? "✓" : "›"}
      </Text>
    </Pressable>
  );
}

function downloadTransactionHistoryBackup(
  backup
) {
  if (
    !backup ||
    typeof document === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function" ||
    typeof Blob === "undefined"
  ) {
    throw new Error(
      "Backup download is available from the web administration interface."
    );
  }

  const brokerAccountKey =
    clean(
      backup?.brokerAccountKey
    ) || "broker-account";

  const generation =
    Number(
      backup?.currentGeneration
    );

  const safeAccount =
    brokerAccountKey.replace(
      /[^a-zA-Z0-9._-]+/g,
      "-"
    );

  const safeGeneration =
    Number.isInteger(generation) &&
    generation > 0
      ? generation
      : "unknown";

  const fileName =
    "gatecep-transaction-history-backup-" +
    safeAccount +
    "-generation-" +
    safeGeneration +
    ".json";

  const json =
    JSON.stringify(
      backup,
      null,
      2
    );

  const blob =
    new Blob(
      [json],
      {
        type:
          "application/json;charset=utf-8"
      }
    );

  const objectUrl =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href =
    objectUrl;

  anchor.download =
    fileName;

  anchor.style.display =
    "none";

  document.body.appendChild(
    anchor
  );

  try {
    anchor.click();
  } finally {
    anchor.remove();

    URL.revokeObjectURL(
      objectUrl
    );
  }

  return fileName;
}

function TransactionHistoryMaintenanceContent() {
  const {
    accessToken
  } = useAdminAuthorization();

  const [targets, setTargets] =
    useState([]);

  const [selectedTargetId, setSelectedTargetId] =
    useState("");

  const [brokers, setBrokers] =
    useState([]);

  const [selectedBrokerId, setSelectedBrokerId] =
    useState("");

  const [loadingTargets, setLoadingTargets] =
    useState(true);

  const [loadingBrokers, setLoadingBrokers] =
    useState(false);

  const [loadingBackup, setLoadingBackup] =
    useState(false);

  const [backup, setBackup] =
    useState(null);

  const [resetReason, setResetReason] =
    useState("");

  const [resetConfirmed, setResetConfirmed] =
    useState(false);

  const [
    downloadedBackup,
    setDownloadedBackup
  ] =
    useState(null);

  const [resetting, setResetting] =
    useState(false);

  const [resetResult, setResetResult] =
    useState(null);

  const [error, setError] =
    useState("");

  const selectedTarget =
    useMemo(
      () =>
        targets.find(
          (target) =>
            clean(target?.id) ===
            selectedTargetId
        ) || null,
      [
        targets,
        selectedTargetId
      ]
    );

  const selectedBroker =
    useMemo(
      () =>
        brokers.find(
          (broker) =>
            clean(broker?.id) ===
            selectedBrokerId
        ) || null,
      [
        brokers,
        selectedBrokerId
      ]
    );

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
          "Investors could not be loaded."
        );
      } finally {
        setLoadingTargets(false);
      }
    }, [accessToken]);

  useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  const chooseTarget =
    useCallback(
      async (target) => {
        const targetId =
          clean(target?.id);

        if (
          !accessToken ||
          !targetId
        ) {
          return;
        }

        setSelectedTargetId(targetId);
        setSelectedBrokerId("");
        setBrokers([]);
        setBackup(null);
      setDownloadedBackup(null);
        setResetReason("");
        setResetConfirmed(false);
        setResetResult(null);
        setError("");
        setLoadingBrokers(true);

        try {
          const result =
            await loadAdminTargetBrokerLinks(
              accessToken,
              targetId
            );

          setBrokers(
            Array.isArray(result?.brokers)
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
      setSelectedBrokerId(
        clean(broker?.id)
      );

      /*
       * A backup belongs to one exact target/broker selection.
       * Changing broker invalidates any previous backup.
       */
      setBackup(null);
      setDownloadedBackup(null);
      setResetReason("");
      setResetConfirmed(false);
      setResetResult(null);
      setError("");
    }, []);

  const generateBackup =
    useCallback(async () => {
      if (
        !accessToken ||
        !selectedTargetId ||
        !selectedBrokerId
      ) {
        return;
      }

      setLoadingBackup(true);
      setBackup(null);
      setDownloadedBackup(null);
      setResetReason("");
      setResetConfirmed(false);
      setResetResult(null);
      setError("");

      try {
        const result =
          await loadAdminBrokerTransactionHistoryBackup({
            accessToken,
            targetUserId:
              selectedTargetId,
            brokerLinkId:
              selectedBrokerId
          });

        setBackup(result);
        setDownloadedBackup(null);
      } catch (backupError) {
        setError(
          backupError?.message ||
          "Transaction History backup could not be generated."
        );
      } finally {
        setLoadingBackup(false);
      }
    }, [
      accessToken,
      selectedTargetId,
      selectedBrokerId
    ]);

  const executionCount =
    Number.isFinite(
      Number(
        backup?.physicalExecutionCount ??
        backup?.executionCount
      )
    )
      ? Number(
          backup?.physicalExecutionCount ??
          backup?.executionCount
        )
      : null;

  const observedGeneration =
    Number(backup?.currentGeneration);

  const historyStateSha256 =
    clean(
      backup?.integrity?.historyStateSha256
    ).toLowerCase();

  const resetReasonReady =
    clean(resetReason).length >= 3;

  const backupDownloaded =
    Boolean(
      backup &&
      downloadedBackup &&
      clean(
        downloadedBackup.payloadSha256
      ) ===
        clean(
          backup?.integrity?.payloadSha256
        ) &&
      clean(
        downloadedBackup.brokerAccountKey
      ) ===
        clean(
          backup?.brokerAccountKey
        ) &&
      Number(
        downloadedBackup.currentGeneration
      ) ===
        Number(
          backup?.currentGeneration
        ) &&
      Number(
        downloadedBackup.physicalExecutionCount
      ) ===
        executionCount &&
      clean(
        downloadedBackup.historyStateSha256
      ).toLowerCase() ===
        historyStateSha256
    );

  const resetReady =
    Boolean(
      backup &&
      backup?.authorityEstablished === true &&
      Number.isInteger(observedGeneration) &&
      observedGeneration >= 1 &&
      Number.isInteger(executionCount) &&
      executionCount >= 0 &&
      /^[a-f0-9]{64}$/.test(
        historyStateSha256
      ) &&
      resetReasonReady &&
      backupDownloaded === true &&
      resetConfirmed === true &&
      !resetting
    );

  const downloadBackup =
    useCallback(() => {
      setError("");

      try {
        const payloadSha256 =
          clean(
            backup?.integrity?.payloadSha256
          );

        const currentGeneration =
          Number(
            backup?.currentGeneration
          );

        const brokerAccountKey =
          clean(
            backup?.brokerAccountKey
          );

        const physicalExecutionCount =
          Number(
            backup?.physicalExecutionCount ??
            backup?.executionCount
          );

        const downloadedHistoryStateSha256 =
          clean(
            backup?.integrity?.historyStateSha256
          ).toLowerCase();

        if (
          !payloadSha256 ||
          !Number.isInteger(
            currentGeneration
          ) ||
          currentGeneration < 1 ||
          !brokerAccountKey ||
          !Number.isInteger(
            physicalExecutionCount
          ) ||
          physicalExecutionCount < 0 ||
          !/^[a-f0-9]{64}$/.test(
            downloadedHistoryStateSha256
          )
        ) {
          throw new Error(
            "A complete verified backup is required before download."
          );
        }

        const fileName =
          downloadTransactionHistoryBackup(
            backup
          );

        setDownloadedBackup({
          fileName,
          payloadSha256,
          currentGeneration,
          brokerAccountKey,
          physicalExecutionCount,
          historyStateSha256:
            downloadedHistoryStateSha256
        });

        setResetConfirmed(false);
      } catch (downloadError) {
        setDownloadedBackup(null);
        setResetConfirmed(false);

        setError(
          downloadError?.message ||
          "Transaction History backup download failed."
        );
      }
    }, [backup]);

  const performReset =
    useCallback(async () => {
      if (
        !accessToken ||
        !selectedTargetId ||
        !selectedBrokerId ||
        !backup ||
        backup?.authorityEstablished !== true ||
        !Number.isInteger(
          Number(backup?.currentGeneration)
        ) ||
        Number(backup?.currentGeneration) < 1 ||
        clean(resetReason).length < 3 ||
        backupDownloaded !== true ||
        resetConfirmed !== true ||
        resetting
      ) {
        return;
      }

      setResetting(true);
      setResetResult(null);
      setError("");

      try {
        const result =
          await resetAdminBrokerTransactionHistory({
            accessToken,

            targetUserId:
              selectedTargetId,

            brokerLinkId:
              selectedBrokerId,

            observedGeneration:
              Number(
                backup.currentGeneration
              ),

            physicalExecutionCount:
              executionCount,

            historyStateSha256:
              historyStateSha256,

            reason:
              clean(resetReason),

            confirmed:
              true
          });

        if (
          result?.resetModel !==
            "PHYSICAL_DELETE_AFTER_BACKUP" ||
          result?.physicalDelete !== true ||
          Number(
            result?.physicalExecutionCountAfter
          ) !== 0
        ) {
          throw new Error(
            "Transaction History maintenance returned an unexpected destructive-reset result."
          );
        }

        setResetResult(result);

        /*
         * Successful physical deletion invalidates the
         * actionable in-memory backup. The downloaded JSON
         * remains with the administrator as recovery evidence,
         * but another maintenance request must start with a
         * fresh server backup.
         */
        setBackup(null);
        setDownloadedBackup(null);
        setResetReason("");
        setResetConfirmed(false);
      } catch (resetError) {
        setResetConfirmed(false);

        if (
          [
            "STALE_TRANSACTION_HISTORY_GENERATION",
            "TRANSACTION_HISTORY_BACKUP_PHYSICAL_COUNT_STALE",
            "TRANSACTION_HISTORY_BACKUP_STATE_STALE"
          ].includes(
            resetError?.code
          )
        ) {
          /*
           * Never silently refresh, retry, or physically delete
           * from stale backup evidence.
           */
          setBackup(null);
          setDownloadedBackup(null);

          setError(
            "Transaction History changed after this backup was reviewed. Generate, download, and review a fresh backup before attempting maintenance again."
          );
        } else {
          setError(
            resetError?.message ||
            "Transaction History maintenance could not be completed."
          );
        }
      } finally {
        setResetting(false);
      }
    }, [
      accessToken,
      selectedTargetId,
      selectedBrokerId,
      backup,
      backupDownloaded,
      resetReason,
      resetConfirmed,
      resetting
    ]);

  return (
    <MobileScreen
      testID="admin-transaction-history-maintenance"
    >
      <MobileHeader
        title="Transaction History Maintenance"
        subtitle="Admin-only broker Transaction History recovery controls."
        onBack={() => router.back()}
        actionLabel="Admin"
        onAction={() =>
          router.push("/admin")
        }
      />

      <View style={styles.noticeCard}>
        <Text style={styles.noticeTitle}>
          Controlled maintenance
        </Text>

        <Text style={styles.noticeText}>
          Normal Transaction History uploads remain
          append-only. Admin maintenance requires a complete
          downloaded broker-history backup before the selected
          broker account can be physically cleared and rebuilt
          from a fresh investor upload.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionEyebrow}>
          Step 1
        </Text>

        <Text style={styles.sectionTitle}>
          Select investor
        </Text>

        <Text style={styles.sectionText}>
          Choose the investor whose server-side broker
          Transaction History requires maintenance.
        </Text>

        {loadingTargets ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />

            <Text style={styles.loadingText}>
              Loading investors…
            </Text>
          </View>
        ) : targets.length === 0 ? (
          <Text style={styles.emptyText}>
            No eligible reconciliation investors were found.
          </Text>
        ) : (
          <View style={styles.optionList}>
            {targets.map((target) => {
              const targetId =
                clean(target?.id);

              return (
                <SelectCard
                  key={targetId}
                  title={targetLabel(target)}
                  detail={
                    targetId
                      ? `User ${targetId}`
                      : ""
                  }
                  selected={
                    selectedTargetId ===
                    targetId
                  }
                  onPress={() =>
                    chooseTarget(target)
                  }
                  testID={
                    `txhist-target-${targetId}`
                  }
                />
              );
            })}
          </View>
        )}
      </View>

      {selectedTarget ? (
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>
            Step 2
          </Text>

          <Text style={styles.sectionTitle}>
            Select broker account
          </Text>

          <Text style={styles.sectionText}>
            Only the selected investor's active broker
            accounts are eligible.
          </Text>

          {loadingBrokers ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator />

              <Text style={styles.loadingText}>
                Loading broker accounts…
              </Text>
            </View>
          ) : brokers.length === 0 ? (
            <Text style={styles.emptyText}>
              No active broker accounts were found for
              this investor.
            </Text>
          ) : (
            <View style={styles.optionList}>
              {brokers.map((broker) => {
                const brokerId =
                  clean(broker?.id);

                return (
                  <SelectCard
                    key={brokerId}
                    title={brokerLabel(broker)}
                    detail={
                      clean(
                        broker?.brokerAccountKey
                      ) ||
                      "Server-authoritative broker link"
                    }
                    selected={
                      selectedBrokerId ===
                      brokerId
                    }
                    onPress={() =>
                      chooseBroker(broker)
                    }
                    testID={
                      `txhist-broker-${brokerId}`
                    }
                  />
                );
              })}
            </View>
          )}
        </View>
      ) : null}

      {selectedTarget &&
      selectedBroker ? (
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>
            Step 3
          </Text>

          <Text style={styles.sectionTitle}>
            Generate server backup
          </Text>

          <Text style={styles.sectionText}>
            Review the exact server-side Transaction
            History snapshot before any future destructive
            maintenance is enabled.
          </Text>

          <View style={styles.contextCard}>
            <Text style={styles.contextLabel}>
              Investor
            </Text>

            <Text style={styles.contextValue}>
              {targetLabel(selectedTarget)}
            </Text>

            <Text style={styles.contextLabel}>
              Broker account
            </Text>

            <Text style={styles.contextValue}>
              {brokerLabel(selectedBroker)}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={loadingBackup}
            onPress={generateBackup}
            testID="txhist-generate-backup"
            style={({ pressed }) => [
              styles.primaryButton,
              loadingBackup &&
                styles.disabled,
              pressed &&
                !loadingBackup &&
                styles.pressed
            ]}
          >
            {loadingBackup ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.primaryButtonText}>
                Generate Backup Preview
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {backup ? (
        <View
          style={styles.backupCard}
          testID="txhist-backup-result"
        >
          <Text style={styles.backupEyebrow}>
            Backup ready
          </Text>

          <Text style={styles.backupTitle}>
            {executionCount ?? 0} execution
            {(executionCount ?? 0) === 1
              ? ""
              : "s"}
          </Text>

          <Text style={styles.backupText}>
            Schema:{" "}
            {clean(backup?.schema) ||
              "Unknown"}
          </Text>

          <Text style={styles.backupText}>
            Generated:{" "}
            {clean(backup?.generatedAt) ||
              "Unknown"}
          </Text>

          <Text style={styles.backupText}>
            Account:{" "}
            {clean(backup?.brokerAccountKey) ||
              brokerLabel(selectedBroker)}
          </Text>

          <Text style={styles.backupText}>
            Generation:{" "}
            {Number.isInteger(observedGeneration)
              ? observedGeneration
              : "Unavailable"}
          </Text>

          <View style={styles.safetyCard}>
            <Text style={styles.safetyTitle}>
              Complete physical-history backup
            </Text>

            <Text style={styles.safetyText}>
              This verified backup contains all
              physical canonical Transaction History
              executions for the selected investor
              and broker account. Physical deletion
              remains disabled until this exact backup
              is downloaded, a reason is entered, and
              explicit confirmation is provided.
            </Text>
          </View>

          <View
            style={styles.downloadCard}
          >
            <Text style={styles.downloadTitle}>
              Download verified backup
            </Text>

            <Text style={styles.downloadText}>
              Save this exact server-generated JSON backup before any physical Transaction History deletion is allowed.
            </Text>

            <Text style={styles.downloadHash}>
              SHA-256:{" "}
              {clean(
                backup?.integrity?.payloadSha256
              ) || "Unavailable"}
            </Text>

            <Pressable
              accessibilityRole="button"
              disabled={
                !clean(
                  backup?.integrity?.payloadSha256
                )
              }
              onPress={downloadBackup}
              testID="txhist-backup-download"
              style={({ pressed }) => [
                styles.downloadButton,
                !clean(
                  backup?.integrity?.payloadSha256
                ) &&
                  styles.disabled,
                pressed &&
                  clean(
                    backup?.integrity?.payloadSha256
                  ) &&
                  styles.pressed
              ]}
            >
              <Text
                style={styles.downloadButtonText}
              >
                Download Backup JSON
              </Text>
            </Pressable>

            {backupDownloaded ? (
              <Text
                style={styles.downloadSuccess}
                testID="txhist-backup-downloaded"
              >
                Backup downloaded:{" "}
                {downloadedBackup?.fileName}
              </Text>
            ) : (
              <Text style={styles.downloadPending}>
                Download required before physical Transaction History deletion can be enabled.
              </Text>
            )}
          </View>

          <View style={styles.resetSection}>
            <Text style={styles.sectionEyebrow}>
              Step 4
            </Text>

            <Text style={styles.sectionTitle}>
              Clear Transaction History
            </Text>

            <Text style={styles.sectionText}>
              The server will first recheck this exact
              investor and broker account, authority generation,
              complete physical execution count, and history
              state SHA. If every backup interlock still matches,
              all canonical Transaction History records for only
              this selected broker account will be physically
              deleted.
            </Text>

            <Text style={styles.contextLabel}>
              Maintenance reason
            </Text>

            <TextInput
              editable={!resetting}
              multiline
              onChangeText={(value) => {
                setResetReason(value);
                setResetConfirmed(false);
              }}
              placeholder="Enter the administrative recovery reason"
              testID="txhist-reset-reason"
              value={resetReason}
              style={styles.reasonInput}
            />

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{
                checked:
                  resetConfirmed
              }}
              disabled={
                !resetReasonReady ||
                resetting
              }
              onPress={() =>
                setResetConfirmed(
                  (value) => !value
                )
              }
              testID="txhist-reset-confirmation"
              style={({ pressed }) => [
                styles.confirmationRow,
                (
                  !resetReasonReady ||
                  resetting
                ) &&
                  styles.disabled,
                pressed &&
                  resetReasonReady &&
                  !resetting &&
                  styles.pressed
              ]}
            >
              <View
                style={[
                  styles.confirmationBox,
                  resetConfirmed &&
                    styles.confirmationBoxChecked
                ]}
              >
                <Text style={styles.confirmationMark}>
                  {resetConfirmed ? "✓" : ""}
                </Text>
              </View>

              <Text style={styles.confirmationText}>
                I confirm that I reviewed and downloaded this
                exact complete backup for this investor&apos;s
                selected broker account. I understand that, if
                the server backup interlocks still match, all
                canonical Transaction History records for this
                selected broker account will be physically
                deleted.
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={!resetReady}
              onPress={performReset}
              testID="txhist-reset-submit"
              style={({ pressed }) => [
                styles.dangerButton,
                !resetReady &&
                  styles.disabled,
                pressed &&
                  resetReady &&
                  styles.pressed
              ]}
            >
              {resetting ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.dangerButtonText}>
                  Clear Transaction History
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      {resetResult ? (
        <View
          style={styles.resultCard}
          testID="txhist-reset-result"
        >
          <Text style={styles.resultTitle}>
            Transaction History cleared
          </Text>

          <Text style={styles.resultText}>
            The selected broker account&apos;s canonical
            Transaction History was physically deleted after
            the downloaded backup was revalidated.
          </Text>

          <Text style={styles.resultText}>
            Account:{" "}
            {clean(resetResult?.brokerAccountKey) ||
              "Selected broker account"}
          </Text>

          <Text style={styles.resultText}>
            Authority generation preserved:{" "}
            {String(
              resetResult?.currentGeneration ??
              "?"
            )}
          </Text>

          <Text style={styles.resultText}>
            Physical executions before:{" "}
            {String(
              resetResult?.physicalExecutionCount ??
              0
            )}
          </Text>

          <Text style={styles.resultText}>
            Deleted:{" "}
            {String(
              resetResult?.deletedCount ??
              0
            )}
          </Text>

          <Text style={styles.resultText}>
            Physical executions after:{" "}
            {String(
              resetResult?.physicalExecutionCountAfter ??
              "?"
            )}
          </Text>

          <Text style={styles.resultText}>
            Maintenance model:{" "}
            {clean(resetResult?.resetModel) ||
              "Unknown"}
          </Text>

          <Text style={styles.resultText}>
            The investor may now upload the original broker
            Transaction History again. The normal investor
            upload path will process it under the current
            Transaction History rules.
          </Text>
        </View>
      ) : null}

      {error ? (
        <View
          style={styles.errorCard}
          testID="txhist-maintenance-error"
        >
          <Text style={styles.errorTitle}>
            Maintenance request unavailable
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : null}
    </MobileScreen>
  );
}

export default function AdminTransactionHistoryMaintenance() {
  return (
    <AdminAccessGate testID="txhist-admin-gate">
      <TransactionHistoryMaintenanceContent />
    </AdminAccessGate>
  );
}

const styles =
  StyleSheet.create({
    noticeCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        "rgba(34,211,238,.32)",
      backgroundColor:
        "rgba(34,211,238,.08)",
      padding: 16,
      marginBottom: 14
    },

    noticeTitle: {
      color: "#67e8f9",
      fontSize: 16,
      fontWeight: "900"
    },

    noticeText: {
      color: "#cbd5e1",
      fontSize: 12,
      lineHeight: 18,
      marginTop: 7
    },

    section: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#1e293b",
      backgroundColor: "#020617",
      padding: 16,
      marginBottom: 14
    },

    sectionEyebrow: {
      color: "#67e8f9",
      fontSize: 10,
      fontWeight: "900",
      textTransform: "uppercase"
    },

    sectionTitle: {
      color: "#f8fafc",
      fontSize: 18,
      fontWeight: "900",
      marginTop: 4
    },

    sectionText: {
      color: "#94a3b8",
      fontSize: 12,
      lineHeight: 18,
      marginTop: 6
    },

    optionList: {
      gap: 9,
      marginTop: 14
    },

    selectCard: {
      minHeight: 62,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: "#334155",
      backgroundColor: "#0f172a",
      padding: 13,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 12
    },

    selectCardSelected: {
      borderColor: "#22d3ee",
      backgroundColor:
        "rgba(34,211,238,.08)"
    },

    selectCopy: {
      flex: 1
    },

    selectTitle: {
      color: "#f8fafc",
      fontSize: 14,
      fontWeight: "800"
    },

    selectDetail: {
      color: "#94a3b8",
      fontSize: 11,
      marginTop: 4
    },

    selectIndicator: {
      color: "#67e8f9",
      fontSize: 19,
      fontWeight: "900"
    },

    loadingRow: {
      minHeight: 70,
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10
    },

    loadingText: {
      color: "#94a3b8",
      fontSize: 12
    },

    emptyText: {
      color: "#94a3b8",
      fontSize: 12,
      marginTop: 12
    },

    contextCard: {
      borderRadius: 12,
      backgroundColor: "#0f172a",
      padding: 13,
      marginTop: 14
    },

    contextLabel: {
      color: "#64748b",
      fontSize: 10,
      fontWeight: "800",
      textTransform: "uppercase",
      marginTop: 5
    },

    contextValue: {
      color: "#e2e8f0",
      fontSize: 13,
      fontWeight: "800",
      marginTop: 3,
      marginBottom: 5
    },

    primaryButton: {
      minHeight: 48,
      marginTop: 14,
      borderRadius: 12,
      backgroundColor: "#0891b2",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16
    },

    primaryButtonText: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "900"
    },

    backupCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        "rgba(34,197,94,.4)",
      backgroundColor:
        "rgba(34,197,94,.08)",
      padding: 16,
      marginBottom: 14
    },

    backupEyebrow: {
      color: "#86efac",
      fontSize: 10,
      fontWeight: "900",
      textTransform: "uppercase"
    },

    backupTitle: {
      color: "#f0fdf4",
      fontSize: 22,
      fontWeight: "900",
      marginTop: 5
    },

    backupText: {
      color: "#bbf7d0",
      fontSize: 11,
      marginTop: 5
    },

    safetyCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        "rgba(245,158,11,.35)",
      backgroundColor:
        "rgba(245,158,11,.08)",
      padding: 12,
      marginTop: 14
    },

    safetyTitle: {
      color: "#fcd34d",
      fontSize: 13,
      fontWeight: "900"
    },

    safetyText: {
      color: "#fde68a",
      fontSize: 11,
      lineHeight: 17,
      marginTop: 5
    },

    downloadCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        "rgba(34,211,238,.35)",
      backgroundColor:
        "rgba(34,211,238,.06)",
      padding: 12,
      marginTop: 14,
      gap: 8
    },

    downloadTitle: {
      color: "#a5f3fc",
      fontSize: 13,
      fontWeight: "900"
    },

    downloadText: {
      color: "#cbd5e1",
      fontSize: 11,
      lineHeight: 17
    },

    downloadHash: {
      color: "#94a3b8",
      fontSize: 10
    },

    downloadButton: {
      minHeight: 44,
      borderRadius: 10,
      backgroundColor: "#0891b2",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 10
    },

    downloadButtonText: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "900"
    },

    downloadSuccess: {
      color: "#86efac",
      fontSize: 11,
      fontWeight: "800"
    },

    downloadPending: {
      color: "#fcd34d",
      fontSize: 11
    },

    resetSection: {
      marginTop: 18,
      gap: 10
    },

    reasonInput: {
      minHeight: 92,
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        "rgba(148,163,184,.35)",
      backgroundColor:
        "rgba(15,23,42,.72)",
      color: "#f8fafc",
      paddingHorizontal: 12,
      paddingVertical: 10,
      textAlignVertical: "top"
    },

    confirmationRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        "rgba(248,113,113,.35)",
      padding: 12
    },

    confirmationBox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: "#94a3b8",
      alignItems: "center",
      justifyContent: "center"
    },

    confirmationBoxChecked: {
      borderColor: "#f87171"
    },

    confirmationMark: {
      color: "#f87171",
      fontWeight: "900"
    },

    confirmationText: {
      flex: 1,
      color: "#e2e8f0",
      fontSize: 13,
      lineHeight: 19
    },

    dangerButton: {
      minHeight: 48,
      borderRadius: 12,
      backgroundColor: "#b91c1c",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 12
    },

    dangerButtonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "900"
    },

    resultCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        "rgba(74,222,128,.35)",
      backgroundColor:
        "rgba(34,197,94,.08)",
      padding: 16,
      marginBottom: 14
    },

    resultTitle: {
      color: "#86efac",
      fontSize: 16,
      fontWeight: "900",
      marginBottom: 8
    },

    resultText: {
      color: "#d1fae5",
      fontSize: 13,
      lineHeight: 19
    },

    errorCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        "rgba(239,68,68,.35)",
      backgroundColor:
        "rgba(239,68,68,.08)",
      padding: 16,
      marginBottom: 14
    },

    errorTitle: {
      color: "#fca5a5",
      fontSize: 14,
      fontWeight: "900"
    },

    errorText: {
      color: "#fecaca",
      fontSize: 12,
      lineHeight: 18,
      marginTop: 6
    },

    disabled: {
      opacity: 0.5
    },

    pressed: {
      opacity: 0.78
    }
  });
