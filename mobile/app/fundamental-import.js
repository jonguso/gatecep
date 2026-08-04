import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  router
} from "expo-router";

import {
  FUNDAMENTAL_IMPORT_FORMATS,
  FUNDAMENTAL_IMPORT_MODES,
  buildFundamentalCsvTemplate,
  buildFundamentalJsonTemplate,
  importFundamentalData,
  previewFundamentalImport
} from "../src/features/fundamentals/fundamentalImportService";

import {
  loadFundamentalRecords,
  loadFundamentalRepositoryMetadata
} from "../src/features/fundamentals/fundamentalRepository";

import {
  initializeFundamentalRepository
} from "../src/features/fundamentals/fundamentalSeedLoader";

import {
  registerBuiltInFundamentalAdapters
} from "../src/features/fundamentals/providers/registerBuiltInFundamentalAdapters";

/*
 * ============================================================
 * PC-024D
 * FUNDAMENTAL DATA IMPORT DASHBOARD
 * ============================================================
 *
 * Provides:
 *
 * - CSV, normalized JSON, and provider JSON input,
 * - preview before import,
 * - MERGE / REPLACE / PREVIEW modes,
 * - provider adapter selection,
 * - validation errors and warnings,
 * - unknown field reporting,
 * - repository summary,
 * - stored fundamental records,
 * - data-quality and readiness indicators,
 * - seed initialization,
 * - safe refresh controls.
 *
 * Safeguards:
 *
 * - blank values remain null,
 * - no financial value is invented,
 * - only validated records are saved,
 * - no portfolio, cash, or broker state is modified.
 * ============================================================
 */

const IMPORT_FORMATS = [
  FUNDAMENTAL_IMPORT_FORMATS
    .CSV,

  FUNDAMENTAL_IMPORT_FORMATS
    .NORMALIZED_JSON,

  FUNDAMENTAL_IMPORT_FORMATS
    .PROVIDER_JSON
];

const IMPORT_MODES = [
  FUNDAMENTAL_IMPORT_MODES
    .PREVIEW,

  FUNDAMENTAL_IMPORT_MODES
    .MERGE,

  FUNDAMENTAL_IMPORT_MODES
    .REPLACE
];

const PROVIDERS = [
  "GENERIC_PROVIDER"
];

export default function FundamentalImportScreen() {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    working,
    setWorking
  ] = useState(false);

  const [
    refreshing,
    setRefreshing
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  const [
    format,
    setFormat
  ] = useState(
    FUNDAMENTAL_IMPORT_FORMATS
      .CSV
  );

  const [
    importMode,
    setImportMode
  ] = useState(
    FUNDAMENTAL_IMPORT_MODES
      .PREVIEW
  );

  const [
    providerId,
    setProviderId
  ] = useState(
    "GENERIC_PROVIDER"
  );

  const [
    payloadText,
    setPayloadText
  ] = useState("");

  const [
    preview,
    setPreview
  ] = useState(null);

  const [
    importResult,
    setImportResult
  ] = useState(null);

  const [
    records,
    setRecords
  ] = useState([]);

  const [
    metadata,
    setMetadata
  ] = useState(null);

  const [
    selectedSymbol,
    setSelectedSymbol
  ] = useState(null);

  const loadRepository =
    useCallback(
      async ({
        fullLoader = false
      } = {}) => {
        try {
          if (fullLoader) {
            setLoading(true);
          } else {
            setRefreshing(true);
          }

          setError("");

          registerBuiltInFundamentalAdapters();

          await initializeFundamentalRepository();

          const [
            storedRecords,
            repositoryMetadata
          ] =
            await Promise.all([
              loadFundamentalRecords(),
              loadFundamentalRepositoryMetadata()
            ]);

          setRecords(
            Array.isArray(
              storedRecords
            )
              ? storedRecords
              : []
          );

          setMetadata(
            repositoryMetadata
          );

          setSelectedSymbol(
            (current) =>
              current ||
              storedRecords?.[0]
                ?.symbol ||
              null
          );
        } catch (
          loadError
        ) {
          console.error(
            "Unable to load fundamental repository:",
            loadError
          );

          setError(
            loadError?.message ||
            "Unable to load the fundamental-data repository."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(
    () => {
      loadRepository({
        fullLoader:
          true
      });
    },
    [
      loadRepository
    ]
  );

  useEffect(
    () => {
      setPreview(null);
      setImportResult(null);
    },
    [
      format,
      importMode,
      providerId,
      payloadText
    ]
  );

  const selectedRecord =
    useMemo(
      () =>
        records.find(
          (record) =>
            record?.symbol ===
            selectedSymbol
        ) ||
        records[0] ||
        null,
      [
        records,
        selectedSymbol
      ]
    );

  const repositorySummary =
    useMemo(
      () => {
        const researchReady =
          records.filter(
            isResearchReady
          ).length;

        const withWarnings =
          records.filter(
            (record) =>
              safeArray(
                record
                  ?.dataQuality
                  ?.warnings
              ).length >
                0 ||
              safeArray(
                record
                  ?.validation
                  ?.warnings
              ).length >
                0
          ).length;

        const averageQuality =
          average(
            records.map(
              (record) =>
                record
                  ?.dataQualityScore
            )
          );

        return {
          total:
            records.length,

          researchReady,

          identityOnly:
            records.length -
            researchReady,

          withWarnings,

          averageQuality
        };
      },
      [
        records
      ]
    );

  const parsedPayload =
    useMemo(
      () => {
        if (
          format ===
          FUNDAMENTAL_IMPORT_FORMATS
            .CSV
        ) {
          return payloadText;
        }

        if (!payloadText.trim()) {
          return null;
        }

        try {
          return JSON.parse(
            payloadText
          );
        } catch {
          return null;
        }
      },
      [
        format,
        payloadText
      ]
    );

  const handlePreview =
    useCallback(
      async () => {
        try {
          setWorking(true);
          setError("");
          setImportResult(null);

          if (
            !payloadText.trim()
          ) {
            throw new Error(
              "Paste CSV or JSON data before previewing."
            );
          }

          if (
            format !==
              FUNDAMENTAL_IMPORT_FORMATS
                .CSV &&
            parsedPayload ===
              null
          ) {
            throw new Error(
              "The JSON input is not valid."
            );
          }

          const result =
            previewFundamentalImport({
              format,

              payload:
                format ===
                FUNDAMENTAL_IMPORT_FORMATS
                  .CSV
                  ? payloadText
                  : parsedPayload,

              providerId:
                format ===
                FUNDAMENTAL_IMPORT_FORMATS
                  .PROVIDER_JSON
                  ? providerId
                  : null
            });

          setPreview(
            result
          );
        } catch (
          previewError
        ) {
          setError(
            previewError?.message ||
            "Unable to preview the import."
          );
        } finally {
          setWorking(false);
        }
      },
      [
        format,
        parsedPayload,
        payloadText,
        providerId
      ]
    );

  const handleImport =
    useCallback(
      async () => {
        try {
          setWorking(true);
          setError("");

          if (
            !payloadText.trim()
          ) {
            throw new Error(
              "Paste CSV or JSON data before importing."
            );
          }

          if (
            format !==
              FUNDAMENTAL_IMPORT_FORMATS
                .CSV &&
            parsedPayload ===
              null
          ) {
            throw new Error(
              "The JSON input is not valid."
            );
          }

          const result =
            await importFundamentalData({
              format,

              payload:
                format ===
                FUNDAMENTAL_IMPORT_FORMATS
                  .CSV
                  ? payloadText
                  : parsedPayload,

              providerId:
                format ===
                FUNDAMENTAL_IMPORT_FORMATS
                  .PROVIDER_JSON
                  ? providerId
                  : null,

              importMode
            });

          setImportResult(
            result
          );

          setPreview(
            result
          );

          await loadRepository();

          if (
            result?.imported >
            0
          ) {
            Alert.alert(
              "Fundamental Import Complete",
              `${result.imported} company record(s) were imported.`
            );
          }
        } catch (
          importError
        ) {
          console.error(
            "Unable to import fundamental data:",
            importError
          );

          setError(
            importError?.message ||
            "Unable to import fundamental data."
          );
        } finally {
          setWorking(false);
        }
      },
      [
        format,
        importMode,
        loadRepository,
        parsedPayload,
        payloadText,
        providerId
      ]
    );

  const loadCsvTemplate =
    useCallback(
      () => {
        setFormat(
          FUNDAMENTAL_IMPORT_FORMATS
            .CSV
        );

        setPayloadText(
          buildFundamentalCsvTemplate()
        );
      },
      []
    );

  const loadJsonTemplate =
    useCallback(
      () => {
        setFormat(
          FUNDAMENTAL_IMPORT_FORMATS
            .NORMALIZED_JSON
        );

        setPayloadText(
          JSON.stringify(
            buildFundamentalJsonTemplate(),
            null,
            2
          )
        );
      },
      []
    );

  const clearWorkspace =
    useCallback(
      () => {
        setPayloadText("");
        setPreview(null);
        setImportResult(null);
        setError("");
      },
      []
    );

  if (loading) {
    return (
      <View
        style={
          styles.centerScreen
        }
      >
        <ActivityIndicator
          size="large"
          color="#22d3ee"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading fundamental-data repository...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={
        styles.screen
      }
      contentContainerStyle={
        styles.content
      }
      keyboardShouldPersistTaps="handled"
    >
      <Text
        style={
          styles.eyebrow
        }
      >
        PC-024D
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Fundamental Data Import
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Import verified company fundamentals from CSV,
        normalized JSON, or registered provider payloads.
        Preview and validate all records before repository
        updates.
      </Text>

      {error ? (
        <View
          style={
            styles.errorCard
          }
        >
          <Text
            style={
              styles.errorText
            }
          >
            {error}
          </Text>
        </View>
      ) : null}

      <View
        style={
          styles.hero
        }
      >
        <View
          style={
            styles.heroScore
          }
        >
          <Text
            style={
              styles.heroScoreValue
            }
          >
            {
              roundWhole(
                repositorySummary
                  .averageQuality
              )
            }
          </Text>

          <Text
            style={
              styles.heroScoreMaximum
            }
          >
            /100
          </Text>
        </View>

        <View
          style={
            styles.heroContent
          }
        >
          <Text
            style={
              styles.heroLabel
            }
          >
            Fundamental Repository
          </Text>

          <Text
            style={
              styles.heroTitle
            }
          >
            {
              repositorySummary
                .researchReady
            }{" "}
            Research-Ready Record(s)
          </Text>

          <Text
            style={
              styles.heroText
            }
          >
            {
              repositorySummary
                .total
            }{" "}
            total record(s),{" "}
            {
              repositorySummary
                .identityOnly
            }{" "}
            identity-only record(s), and{" "}
            {
              repositorySummary
                .withWarnings
            }{" "}
            record(s) with warnings.
          </Text>
        </View>
      </View>

      <View
        style={
          styles.metricGrid
        }
      >
        <Metric
          label="Stored Records"
          value={
            repositorySummary
              .total
          }
        />

        <Metric
          label="Research Ready"
          value={
            repositorySummary
              .researchReady
          }
        />

        <Metric
          label="Identity Only"
          value={
            repositorySummary
              .identityOnly
          }
        />

        <Metric
          label="With Warnings"
          value={
            repositorySummary
              .withWarnings
          }
        />

        <Metric
          label="Seed Version"
          value={
            metadata
              ?.seedVersion ||
            "Not seeded"
          }
        />

        <Metric
          label="Schema Version"
          value={
            metadata
              ?.schemaVersion ??
            "N/A"
          }
        />
      </View>

      <Section
        title="Import Configuration"
        description="Choose an input format, provider adapter, and repository update mode."
      >
        <Text
          style={
            styles.fieldLabel
          }
        >
          Input Format
        </Text>

        <OptionRow
          values={
            IMPORT_FORMATS
          }
          selected={
            format
          }
          onSelect={
            setFormat
          }
        />

        {format ===
        FUNDAMENTAL_IMPORT_FORMATS
          .PROVIDER_JSON ? (
          <>
            <Text
              style={
                styles.fieldLabel
              }
            >
              Provider Adapter
            </Text>

            <OptionRow
              values={
                PROVIDERS
              }
              selected={
                providerId
              }
              onSelect={
                setProviderId
              }
            />
          </>
        ) : null}

        <Text
          style={
            styles.fieldLabel
          }
        >
          Import Mode
        </Text>

        <OptionRow
          values={
            IMPORT_MODES
          }
          selected={
            importMode
          }
          onSelect={
            setImportMode
          }
        />

        <View
          style={
            styles.inlineButtons
          }
        >
          <Pressable
            style={
              styles.smallButton
            }
            onPress={
              loadCsvTemplate
            }
          >
            <Text
              style={
                styles.smallButtonText
              }
            >
              Load CSV Template
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.smallButton
            }
            onPress={
              loadJsonTemplate
            }
          >
            <Text
              style={
                styles.smallButtonText
              }
            >
              Load JSON Template
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.smallButtonMuted
            }
            onPress={
              clearWorkspace
            }
          >
            <Text
              style={
                styles.smallButtonText
              }
            >
              Clear
            </Text>
          </Pressable>
        </View>
      </Section>

      <Section
        title="Import Data"
        description="Paste verified CSV or JSON data. Blank fields remain null and are never converted to zero."
      >
        <TextInput
          style={
            styles.editor
          }
          multiline
          autoCapitalize="none"
          autoCorrect={
            false
          }
          textAlignVertical="top"
          placeholder={
            format ===
            FUNDAMENTAL_IMPORT_FORMATS
              .CSV
              ? "Paste CSV data here..."
              : "Paste JSON data here..."
          }
          placeholderTextColor="#64748b"
          value={
            payloadText
          }
          onChangeText={
            setPayloadText
          }
        />

        <Text
          style={
            styles.characterCount
          }
        >
          {
            payloadText.length
          }{" "}
          character(s)
        </Text>

        <View
          style={
            styles.inlineButtons
          }
        >
          <Pressable
            disabled={
              working
            }
            style={[
              styles.previewButton,

              working &&
                styles.disabled
            ]}
            onPress={
              handlePreview
            }
          >
            <Text
              style={
                styles.previewButtonText
              }
            >
              Preview and Validate
            </Text>
          </Pressable>

          <Pressable
            disabled={
              working
            }
            style={[
              styles.importButton,

              working &&
                styles.disabled
            ]}
            onPress={
              handleImport
            }
          >
            {working ? (
              <ActivityIndicator
                color="white"
              />
            ) : (
              <Text
                style={
                  styles.importButtonText
                }
              >
                {
                  importMode ===
                  FUNDAMENTAL_IMPORT_MODES
                    .PREVIEW
                    ? "Run Preview"
                    : `${formatLabel(
                        importMode
                      )} Import`
                }
              </Text>
            )}
          </Pressable>
        </View>
      </Section>

      {preview ? (
        <Section
          title="Import Preview"
          description="Review validation results before relying on imported research data."
        >
          <View
            style={
              styles.metricGrid
            }
          >
            <Metric
              label="Status"
              value={
                formatLabel(
                  preview?.status
                )
              }
            />

            <Metric
              label="Received"
              value={
                preview
                  ?.summary
                  ?.received ??
                preview
                  ?.companyCount ??
                0
              }
            />

            <Metric
              label="Valid"
              value={
                preview
                  ?.summary
                  ?.valid ??
                0
              }
            />

            <Metric
              label="Invalid"
              value={
                preview
                  ?.summary
                  ?.invalid ??
                0
              }
            />

            <Metric
              label="Research Ready"
              value={
                preview
                  ?.summary
                  ?.researchReady ??
                0
              }
            />

            <Metric
              label="Imported"
              value={
                importResult
                  ?.imported ??
                0
              }
            />
          </View>

          <PreviewRecords
            records={
              preview?.prepared
            }
          />

          <IssueList
            title="Validation Errors"
            issues={
              preview?.errors
            }
            error
          />

          <IssueList
            title="Validation Warnings"
            issues={
              preview?.warnings
            }
          />

          <IssueList
            title="Unknown Fields"
            issues={
              safeArray(
                preview
                  ?.unknownFields
              ).map(
                (field) => ({
                  code:
                    field,

                  message:
                    "Field was not mapped and was ignored."
                })
              )
            }
          />
        </Section>
      ) : null}

      <Section
        title="Fundamental Repository"
        description="Stored identity and financial records available to PC-023B research orchestration."
      >
        {records.length ? (
          records.map(
            (
              record,
              index
            ) => (
              <RepositoryRecordCard
                key={
                  record?.symbol ||
                  `RECORD-${index}`
                }
                record={
                  record
                }
                selected={
                  selectedRecord
                    ?.symbol ===
                  record?.symbol
                }
                onPress={() =>
                  setSelectedSymbol(
                    record?.symbol
                  )
                }
              />
            )
          )
        ) : (
          <EmptyState
            title="Repository Is Empty"
            message="Import verified company fundamentals to create research-ready records."
          />
        )}
      </Section>

      {selectedRecord ? (
        <Section
          title={`${selectedRecord.symbol} Fundamental Detail`}
          description="Latest normalized values, historical coverage, and data-quality warnings."
        >
          <FundamentalDetail
            record={
              selectedRecord
            }
          />
        </Section>
      ) : null}

      <View
        style={
          styles.protectionCard
        }
      >
        <Text
          style={
            styles.protectionTitle
          }
        >
          Verified Data Required
        </Text>

        <Text
          style={
            styles.protectionText
          }
        >
          This dashboard does not invent EPS, revenue, cash
          flow, dividends, book value, or valuation multiples.
          Identity-only seed records remain incomplete until
          verified filings, imports, or provider data are
          supplied.
        </Text>
      </View>

      <Pressable
        disabled={
          refreshing
        }
        style={[
          styles.primaryButton,

          refreshing &&
            styles.disabled
        ]}
        onPress={() =>
          loadRepository()
        }
      >
        {refreshing ? (
          <ActivityIndicator
            color="white"
          />
        ) : (
          <Text
            style={
              styles.primaryButtonText
            }
          >
            Refresh Repository
          </Text>
        )}
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.replace("/fundamental-data-hub")
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Back
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function PreviewRecords({
  records
}) {
  const items =
    safeArray(records);

  if (!items.length) {
    return (
      <EmptyState
        title="No Prepared Records"
        message="No company record could be prepared from the supplied data."
      />
    );
  }

  return (
    <>
      <Text
        style={
          styles.subheading
        }
      >
        Prepared Records
      </Text>

      {items.map(
        (
          record,
          index
        ) => (
          <View
            key={
              record?.symbol ||
              `PREVIEW-${index}`
            }
            style={
              styles.messageCard
            }
          >
            <View
              style={
                styles.cardHeader
              }
            >
              <View
                style={{
                  flex:
                    1
                }}
              >
                <Text
                  style={
                    styles.cardTitle
                  }
                >
                  {
                    record?.symbol ||
                    "Unknown"
                  }
                </Text>

                <Text
                  style={
                    styles.cardSubtitle
                  }
                >
                  {
                    record?.name ||
                    "Unnamed Company"
                  }
                </Text>
              </View>

              <Text
                style={
                  record
                    ?.validation
                    ?.valid
                    ? styles.validText
                    : styles.invalidText
                }
              >
                {
                  record
                    ?.validation
                    ?.valid
                    ? "Valid"
                    : "Invalid"
                }
              </Text>
            </View>

            <Row
              label="Status"
              value={
                formatLabel(
                  record?.status
                )
              }
            />

            <Row
              label="Data Quality"
              value={
                nullableScore(
                  record
                    ?.dataQualityScore
                )
              }
            />

            <Row
              label="Periods"
              value={
                safeArray(
                  record?.periods
                ).length
              }
            />

            <Row
              label="EPS"
              value={
                nullableNumberText(
                  record
                    ?.earningsPerShare
                )
              }
            />

            <Row
              label="Book Value / Share"
              value={
                nullableNumberText(
                  record
                    ?.bookValuePerShare
                )
              }
            />

            <Row
              label="Dividend / Share"
              value={
                nullableNumberText(
                  record
                    ?.dividendPerShare
                )
              }
            />
          </View>
        )
      )}
    </>
  );
}

function RepositoryRecordCard({
  record,
  selected,
  onPress
}) {
  const ready =
    isResearchReady(
      record
    );

  return (
    <Pressable
      style={[
        styles.recordCard,

        selected &&
          styles.recordCardSelected
      ]}
      onPress={
        onPress
      }
    >
      <View
        style={
          styles.cardHeader
        }
      >
        <View
          style={{
            flex:
              1
          }}
        >
          <Text
            style={
              styles.cardTitle
            }
          >
            {
              record?.symbol ||
              "Unknown"
            }
          </Text>

          <Text
            style={
              styles.cardSubtitle
            }
          >
            {
              record?.name ||
              record?.sector ||
              "No company name"
            }
          </Text>
        </View>

        <View
          style={
            styles.statusBlock
          }
        >
          <Text
            style={
              ready
                ? styles.validText
                : styles.warningText
            }
          >
            {ready
              ? "Research Ready"
              : "Identity Only"}
          </Text>

          <Text
            style={
              styles.statusScore
            }
          >
            {
              nullableScore(
                record
                  ?.dataQualityScore
              )
            }
          </Text>
        </View>
      </View>

      <View
        style={
          styles.recordMetrics
        }
      >
        <MiniMetric
          label="Periods"
          value={
            safeArray(
              record?.periods
            ).length
          }
        />

        <MiniMetric
          label="EPS"
          value={
            nullableNumberText(
              record
                ?.earningsPerShare
            )
          }
        />

        <MiniMetric
          label="P/E"
          value={
            nullableNumberText(
              record?.peRatio
            )
          }
        />

        <MiniMetric
          label="Dividend Yield"
          value={
            nullablePercent(
              record
                ?.dividendYieldPercentage
            )
          }
        />
      </View>
    </Pressable>
  );
}

function FundamentalDetail({
  record
}) {
  const qualityWarnings = [
    ...safeArray(
      record
        ?.dataQuality
        ?.warnings
    ),

    ...safeArray(
      record
        ?.validation
        ?.warnings
    )
  ];

  return (
    <>
      <View
        style={
          styles.summaryCard
        }
      >
        <Row
          label="Company"
          value={
            record?.name ||
            "Unknown"
          }
        />

        <Row
          label="Sector"
          value={
            record?.sector ||
            "Unknown"
          }
        />

        <Row
          label="Status"
          value={
            formatLabel(
              record?.status
            )
          }
        />

        <Row
          label="Current Price"
          value={
            nullableCurrency(
              record
                ?.currentPrice
            )
          }
        />

        <Row
          label="Data Quality"
          value={
            nullableScore(
              record
                ?.dataQualityScore
            )
          }
        />

        <Row
          label="Financial Periods"
          value={
            safeArray(
              record?.periods
            ).length
          }
        />
      </View>

      <Text
        style={
          styles.subheading
        }
      >
        Per-Share Metrics
      </Text>

      <View
        style={
          styles.summaryCard
        }
      >
        <Row
          label="EPS"
          value={
            nullableNumberText(
              record
                ?.earningsPerShare
            )
          }
        />

        <Row
          label="Book Value / Share"
          value={
            nullableNumberText(
              record
                ?.bookValuePerShare
            )
          }
        />

        <Row
          label="Revenue / Share"
          value={
            nullableNumberText(
              record
                ?.revenuePerShare
            )
          }
        />

        <Row
          label="FCF / Share"
          value={
            nullableNumberText(
              record
                ?.freeCashFlowPerShare
            )
          }
        />

        <Row
          label="Dividend / Share"
          value={
            nullableNumberText(
              record
                ?.dividendPerShare
            )
          }
        />
      </View>

      <Text
        style={
          styles.subheading
        }
      >
        Valuation and Growth
      </Text>

      <View
        style={
          styles.summaryCard
        }
      >
        <Row
          label="P/E"
          value={
            nullableNumberText(
              record?.peRatio
            )
          }
        />

        <Row
          label="Price / Book"
          value={
            nullableNumberText(
              record
                ?.priceToBookRatio
            )
          }
        />

        <Row
          label="EV / EBITDA"
          value={
            nullableNumberText(
              record
                ?.evToEbitdaRatio
            )
          }
        />

        <Row
          label="Dividend Yield"
          value={
            nullablePercent(
              record
                ?.dividendYieldPercentage
            )
          }
        />

        <Row
          label="Revenue Growth"
          value={
            nullablePercent(
              record
                ?.revenueGrowthPercentage
            )
          }
        />

        <Row
          label="Earnings Growth"
          value={
            nullablePercent(
              record
                ?.earningsGrowthPercentage
            )
          }
        />

        <Row
          label="Dividend Growth"
          value={
            nullablePercent(
              record
                ?.dividendGrowthPercentage
            )
          }
        />
      </View>

      <IssueList
        title="Data-Quality Warnings"
        issues={
          qualityWarnings
        }
      />
    </>
  );
}

function IssueList({
  title,
  issues,
  error = false
}) {
  const items =
    safeArray(issues);

  return (
    <>
      <Text
        style={
          styles.subheading
        }
      >
        {title}
      </Text>

      {items.length ? (
        items.map(
          (
            issue,
            index
          ) => (
            <View
              key={
                `${title}-${issue?.code || index}`
              }
              style={[
                styles.messageCard,

                error
                  ? styles.errorBorder
                  : styles.warningBorder
              ]}
            >
              <Text
                style={
                  error
                    ? styles.issueTitleError
                    : styles.issueTitleWarning
                }
              >
                {
                  issue?.title ||
                  formatLabel(
                    issue?.code ||
                    "Issue"
                  )
                }
              </Text>

              <Text
                style={
                  styles.cardText
                }
              >
                {
                  issue?.message ||
                  String(
                    issue
                  )
                }
              </Text>

              {issue?.symbol ? (
                <Text
                  style={
                    styles.issueMeta
                  }
                >
                  Symbol:{" "}
                  {issue.symbol}
                </Text>
              ) : null}

              {issue?.row ? (
                <Text
                  style={
                    styles.issueMeta
                  }
                >
                  Row:{" "}
                  {issue.row}
                </Text>
              ) : null}
            </View>
          )
        )
      ) : (
        <EmptyState
          title={`No ${title}`}
          message="No issues were reported in this category."
        />
      )}
    </>
  );
}

function Section({
  title,
  description,
  children
}) {
  return (
    <View
      style={
        styles.section
      }
    >
      <Text
        style={
          styles.sectionTitle
        }
      >
        {title}
      </Text>

      {description ? (
        <Text
          style={
            styles.sectionDescription
          }
        >
          {description}
        </Text>
      ) : null}

      {children}
    </View>
  );
}

function Metric({
  label,
  value
}) {
  return (
    <View
      style={
        styles.metricCard
      }
    >
      <Text
        style={
          styles.metricLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.metricValue
        }
      >
        {String(
          value
        )}
      </Text>
    </View>
  );
}

function MiniMetric({
  label,
  value
}) {
  return (
    <View
      style={
        styles.miniMetric
      }
    >
      <Text
        style={
          styles.miniMetricLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.miniMetricValue
        }
      >
        {String(
          value
        )}
      </Text>
    </View>
  );
}

function Row({
  label,
  value
}) {
  return (
    <View
      style={
        styles.row
      }
    >
      <Text
        style={
          styles.rowLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.rowValue
        }
      >
        {String(
          value ??
          "Not available"
        )}
      </Text>
    </View>
  );
}

function OptionRow({
  values,
  selected,
  onSelect
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={
        false
      }
      contentContainerStyle={
        styles.optionRow
      }
    >
      {values.map(
        (value) => (
          <Pressable
            key={
              value
            }
            style={[
              styles.optionButton,

              selected ===
                value &&
                styles.optionButtonActive
            ]}
            onPress={() =>
              onSelect(
                value
              )
            }
          >
            <Text
              style={[
                styles.optionText,

                selected ===
                  value &&
                  styles.optionTextActive
              ]}
            >
              {formatLabel(
                value
              )}
            </Text>
          </Pressable>
        )
      )}
    </ScrollView>
  );
}

function EmptyState({
  title,
  message
}) {
  return (
    <View
      style={
        styles.emptyCard
      }
    >
      <Text
        style={
          styles.cardTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.cardText
        }
      >
        {message}
      </Text>
    </View>
  );
}

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function average(values = []) {
  const valid =
    safeArray(values)
      .map(
        (value) =>
          Number(value)
      )
      .filter(
        (value) =>
          Number.isFinite(
            value
          )
      );

  if (!valid.length) {
    return null;
  }

  return valid.reduce(
    (
      total,
      value
    ) =>
      total + value,
    0
  ) / valid.length;
}

function isResearchReady(
  record
) {
  return Boolean(
    record
      ?.earningsPerShare !==
      null &&
    record
      ?.earningsPerShare !==
      undefined ||
    record
      ?.bookValuePerShare !==
      null &&
    record
      ?.bookValuePerShare !==
      undefined ||
    record
      ?.freeCashFlowPerShare !==
      null &&
    record
      ?.freeCashFlowPerShare !==
      undefined
  );
}

function nullablePercent(value) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      Number(value)
    )
  ) {
    return "Not available";
  }

  return `${Number(
    value
  ).toFixed(2)}%`;
}

function nullableScore(value) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      Number(value)
    )
  ) {
    return "Not available";
  }

  return `${Math.round(
    Number(value)
  )}/100`;
}

function nullableCurrency(value) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      Number(value)
    )
  ) {
    return "Not available";
  }

  return `KES ${Number(
    value
  ).toLocaleString(
    "en-US",
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2
    }
  )}`;
}

function nullableNumberText(value) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      Number(value)
    )
  ) {
    return "Not available";
  }

  return Number(value).toLocaleString(
    "en-US",
    {
      maximumFractionDigits:
        4
    }
  );
}

function roundWhole(value) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      Number(value)
    )
  ) {
    return 0;
  }

  return Math.round(
    Number(value)
  );
}

function formatLabel(value) {
  return String(
    value ||
    ""
  )
    .replaceAll(
      "_",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

const styles =
  StyleSheet.create({
    screen: {
      flex:
        1,

      backgroundColor:
        "#020617"
    },

    content: {
      padding:
        22,

      paddingTop:
        70,

      paddingBottom:
        110
    },

    centerScreen: {
      flex:
        1,

      backgroundColor:
        "#020617",

      alignItems:
        "center",

      justifyContent:
        "center",

      padding:
        24
    },

    loadingText: {
      color:
        "#94a3b8",

      marginTop:
        14
    },

    eyebrow: {
      color:
        "#22d3ee",

      fontWeight:
        "900"
    },

    title: {
      color:
        "white",

      fontSize:
        31,

      fontWeight:
        "900",

      marginTop:
        8
    },

    subtitle: {
      color:
        "#94a3b8",

      lineHeight:
        22,

      marginTop:
        10,

      marginBottom:
        20
    },

    hero: {
      backgroundColor:
        "rgba(34,211,238,.08)",

      borderColor:
        "rgba(34,211,238,.35)",

      borderWidth:
        1,

      borderRadius:
        20,

      padding:
        18,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap:
        17
    },

    heroScore: {
      width:
        96,

      height:
        96,

      borderRadius:
        48,

      borderWidth:
        6,

      borderColor:
        "#22d3ee",

      alignItems:
        "center",

      justifyContent:
        "center"
    },

    heroScoreValue: {
      color:
        "#86efac",

      fontSize:
        29,

      fontWeight:
        "900"
    },

    heroScoreMaximum: {
      color:
        "#94a3b8",

      fontSize:
        11,

      fontWeight:
        "900"
    },

    heroContent: {
      flex:
        1
    },

    heroLabel: {
      color:
        "#67e8f9",

      fontWeight:
        "900"
    },

    heroTitle: {
      color:
        "white",

      fontSize:
        21,

      fontWeight:
        "900",

      marginTop:
        6
    },

    heroText: {
      color:
        "#cbd5e1",

      lineHeight:
        20,

      marginTop:
        7
    },

    metricGrid: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        10,

      marginTop:
        14
    },

    metricCard: {
      width:
        "47%",

      backgroundColor:
        "#020617",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        14,

      padding:
        13
    },

    metricLabel: {
      color:
        "#94a3b8",

      fontSize:
        11
    },

    metricValue: {
      color:
        "white",

      fontWeight:
        "900",

      marginTop:
        6
    },

    section: {
      backgroundColor:
        "#0f172a",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        20,

      padding:
        17,

      marginTop:
        20
    },

    sectionTitle: {
      color:
        "#67e8f9",

      fontSize:
        19,

      fontWeight:
        "900"
    },

    sectionDescription: {
      color:
        "#94a3b8",

      lineHeight:
        20,

      marginTop:
        7,

      marginBottom:
        5
    },

    fieldLabel: {
      color:
        "#cbd5e1",

      fontWeight:
        "900",

      marginTop:
        16
    },

    optionRow: {
      gap:
        8,

      paddingVertical:
        12
    },

    optionButton: {
      backgroundColor:
        "#1e293b",

      paddingHorizontal:
        13,

      paddingVertical:
        10,

      borderRadius:
        12
    },

    optionButtonActive: {
      backgroundColor:
        "#0891b2"
    },

    optionText: {
      color:
        "#94a3b8",

      fontWeight:
        "900"
    },

    optionTextActive: {
      color:
        "white"
    },

    editor: {
      minHeight:
        290,

      backgroundColor:
        "#020617",

      borderColor:
        "#334155",

      borderWidth:
        1,

      borderRadius:
        15,

      padding:
        14,

      marginTop:
        14,

      color:
        "#e2e8f0",

      fontFamily:
        "monospace",

      fontSize:
        13,

      lineHeight:
        19
    },

    characterCount: {
      color:
        "#64748b",

      fontSize:
        11,

      marginTop:
        7,

      textAlign:
        "right"
    },

    inlineButtons: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        9,

      marginTop:
        14
    },

    smallButton: {
      backgroundColor:
        "#155e75",

      paddingHorizontal:
        13,

      paddingVertical:
        11,

      borderRadius:
        12
    },

    smallButtonMuted: {
      backgroundColor:
        "#334155",

      paddingHorizontal:
        13,

      paddingVertical:
        11,

      borderRadius:
        12
    },

    smallButtonText: {
      color:
        "white",

      fontWeight:
        "900"
    },

    previewButton: {
      flex:
        1,

      minWidth:
        145,

      backgroundColor:
        "#7c3aed",

      borderRadius:
        14,

      padding:
        15
    },

    previewButtonText: {
      color:
        "white",

      textAlign:
        "center",

      fontWeight:
        "900"
    },

    importButton: {
      flex:
        1,

      minWidth:
        145,

      backgroundColor:
        "#0891b2",

      borderRadius:
        14,

      padding:
        15
    },

    importButtonText: {
      color:
        "white",

      textAlign:
        "center",

      fontWeight:
        "900"
    },

    recordCard: {
      backgroundColor:
        "#020617",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        15,

      padding:
        14,

      marginTop:
        11
    },

    recordCardSelected: {
      borderColor:
        "#22d3ee",

      borderWidth:
        2
    },

    cardHeader: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "flex-start",

      gap:
        12
    },

    cardTitle: {
      color:
        "#67e8f9",

      fontSize:
        16,

      fontWeight:
        "900"
    },

    cardSubtitle: {
      color:
        "#94a3b8",

      marginTop:
        3
    },

    cardText: {
      color:
        "#cbd5e1",

      lineHeight:
        20,

      marginTop:
        8
    },

    statusBlock: {
      alignItems:
        "flex-end"
    },

    statusScore: {
      color:
        "white",

      fontWeight:
        "900",

      marginTop:
        5
    },

    validText: {
      color:
        "#86efac",

      fontWeight:
        "900"
    },

    invalidText: {
      color:
        "#fca5a5",

      fontWeight:
        "900"
    },

    warningText: {
      color:
        "#fde68a",

      fontWeight:
        "900"
    },

    recordMetrics: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        8,

      marginTop:
        13
    },

    miniMetric: {
      width:
        "47%",

      backgroundColor:
        "#0f172a",

      borderRadius:
        10,

      padding:
        10
    },

    miniMetricLabel: {
      color:
        "#64748b",

      fontSize:
        10
    },

    miniMetricValue: {
      color:
        "white",

      fontWeight:
        "900",

      marginTop:
        4
    },

    summaryCard: {
      backgroundColor:
        "#020617",

      borderRadius:
        15,

      padding:
        14,

      marginTop:
        13
    },

    row: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      gap:
        14,

      marginTop:
        10
    },

    rowLabel: {
      color:
        "#94a3b8",

      flex:
        1
    },

    rowValue: {
      color:
        "white",

      fontWeight:
        "900",

      textAlign:
        "right",

      flex:
        1
    },

    subheading: {
      color:
        "#c084fc",

      fontSize:
        16,

      fontWeight:
        "900",

      marginTop:
        19
    },

    messageCard: {
      backgroundColor:
        "#020617",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        14,

      padding:
        14,

      marginTop:
        11
    },

    errorBorder: {
      borderColor:
        "rgba(239,68,68,.55)"
    },

    warningBorder: {
      borderColor:
        "rgba(245,158,11,.45)"
    },

    issueTitleError: {
      color:
        "#fca5a5",

      fontWeight:
        "900"
    },

    issueTitleWarning: {
      color:
        "#fde68a",

      fontWeight:
        "900"
    },

    issueMeta: {
      color:
        "#64748b",

      fontSize:
        11,

      marginTop:
        6
    },

    emptyCard: {
      backgroundColor:
        "#020617",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        15,

      padding:
        15,

      marginTop:
        13
    },

    protectionCard: {
      backgroundColor:
        "rgba(245,158,11,.10)",

      borderColor:
        "rgba(245,158,11,.35)",

      borderWidth:
        1,

      borderRadius:
        18,

      padding:
        17,

      marginTop:
        20
    },

    protectionTitle: {
      color:
        "#fde68a",

      fontWeight:
        "900"
    },

    protectionText: {
      color:
        "#fef3c7",

      lineHeight:
        21,

      marginTop:
        7
    },

    primaryButton: {
      backgroundColor:
        "#0891b2",

      padding:
        17,

      borderRadius:
        17,

      marginTop:
        15
    },

    primaryButtonText: {
      color:
        "white",

      textAlign:
        "center",

      fontWeight:
        "900"
    },

    secondaryButton: {
      backgroundColor:
        "#1e293b",

      padding:
        16,

      borderRadius:
        17,

      marginTop:
        12
    },

    secondaryButtonText: {
      color:
        "#67e8f9",

      textAlign:
        "center",

      fontWeight:
        "900"
    },

    errorCard: {
      backgroundColor:
        "rgba(239,68,68,.10)",

      borderColor:
        "rgba(239,68,68,.35)",

      borderWidth:
        1,

      borderRadius:
        16,

      padding:
        14,

      marginBottom:
        15
    },

    errorText: {
      color:
        "#fca5a5"
    },

    disabled: {
      opacity:
        0.6
    }
  });
