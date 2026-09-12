import React, {
  useMemo,
  useState
} from "react";

import {
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
  buildMultiPeriodExtractionComparison,
  buildMultiPeriodFilingReadyJson
} from "../src/features/fundamentals/extraction/multiPeriodFilingExtractionService";

import {
  submitExtractionWorkspaceToFilings
} from "../src/features/fundamentals/extraction/extractionSubmissionHandoff";

/*
 * ============================================================
 * PC-025E
 * MULTI-PERIOD FILING EXTRACTION AND COMPARISON
 * ============================================================
 *
 * Paste normalized annual period JSON, compare several fiscal
 * years, detect duplicates and outliers, and generate one
 * filing-ready JSON record.
 * ============================================================
 */

const SAMPLE_PERIODS = [
  {
    fiscalYear:
      2022,

    periodType:
      "ANNUAL",

    periodEnd:
      "2022-12-31",

    currency:
      "KES",

    revenue:
      null,

    netIncome:
      null,

    totalAssets:
      null,

    totalLiabilities:
      null,

    totalEquity:
      null,

    operatingCashFlow:
      null,

    capitalExpenditure:
      null,

    freeCashFlow:
      null,

    sharesOutstanding:
      null,

    earningsPerShare:
      null,

    bookValuePerShare:
      null,

    dividendPerShare:
      null
  },
  {
    fiscalYear:
      2023,

    periodType:
      "ANNUAL",

    periodEnd:
      "2023-12-31",

    currency:
      "KES",

    revenue:
      null,

    netIncome:
      null,

    totalAssets:
      null,

    totalLiabilities:
      null,

    totalEquity:
      null,

    operatingCashFlow:
      null,

    capitalExpenditure:
      null,

    freeCashFlow:
      null,

    sharesOutstanding:
      null,

    earningsPerShare:
      null,

    bookValuePerShare:
      null,

    dividendPerShare:
      null
  }
];

export default function MultiPeriodFilingExtractionScreen() {
  const [
    symbol,
    setSymbol
  ] = useState("SCOM");

  const [
    companyName,
    setCompanyName
  ] = useState(
    "Safaricom PLC"
  );

  const [
    filingType,
    setFilingType
  ] = useState(
    "ANNUAL_REPORT"
  );

  const [
    sourceName,
    setSourceName
  ] = useState("");

  const [
    sourceUrl,
    setSourceUrl
  ] = useState("");

  const [
    periodsJson,
    setPeriodsJson
  ] = useState(
    JSON.stringify(
      SAMPLE_PERIODS,
      null,
      2
    )
  );

  const [
    referencesJson,
    setReferencesJson
  ] = useState("[]");

  const [
    error,
    setError
  ] = useState("");

  const [
    comparison,
    setComparison
  ] = useState(null);

  const [
    outputJson,
    setOutputJson
  ] = useState("");

  const [
    submitting,
    setSubmitting
  ] = useState(false);

  const [
    submitForReview,
    setSubmitForReview
  ] = useState(false);

  const [
    allowDuplicate,
    setAllowDuplicate
  ] = useState(false);

  const [
    submissionResult,
    setSubmissionResult
  ] = useState(null);

  const parsedPeriods =
    useMemo(
      () => {
        try {
          const value =
            JSON.parse(
              periodsJson
            );

          return Array.isArray(value)
            ? value
            : null;
        } catch {
          return null;
        }
      },
      [
        periodsJson
      ]
    );

  const parsedReferences =
    useMemo(
      () => {
        try {
          const value =
            JSON.parse(
              referencesJson
            );

          return Array.isArray(value)
            ? value
            : null;
        } catch {
          return null;
        }
      },
      [
        referencesJson
      ]
    );

  function runComparison() {
    try {
      setError("");

      if (!parsedPeriods) {
        throw new Error(
          "Periods JSON must be a valid JSON array."
        );
      }

      if (!parsedReferences) {
        throw new Error(
          "Source references JSON must be a valid JSON array."
        );
      }

      const result =
        buildMultiPeriodExtractionComparison({
          filing: {
            symbol,

            companyName,

            filingType,

            sourceDocument: {
              source: {
                name:
                  sourceName ||
                  null,

                type:
                  "COMPANY_FILING",

                authoritative:
                  true,

                verified:
                  true,

                url:
                  sourceUrl ||
                  null
              }
            },

            company: {
              symbol,

              name:
                companyName,

              exchange:
                "NSE",

              currency:
                "KES"
            }
          },

          periods:
            parsedPeriods,

          sourceReferences:
            parsedReferences
        });

      setComparison(
        result
      );

      setOutputJson(
        JSON.stringify(
          buildMultiPeriodFilingReadyJson({
            comparison:
              result
          }),
          null,
          2
        )
      );
    } catch (
      comparisonError
    ) {
      setComparison(null);
      setOutputJson("");

      setError(
        comparisonError?.message ||
        "Unable to run the multi-period comparison."
      );
    }
  }

  async function submitToVerifiedFilings() {
    try {
      setSubmitting(true);
      setSubmissionResult(null);

      if (!outputJson) {
        throw new Error(
          "Run the comparison before submitting."
        );
      }

      const result =
        await submitExtractionWorkspaceToFilings({
          filingReadyJson:
            JSON.parse(outputJson),

          workspaceType:
            "MULTI_PERIOD",

          actor: {
            id:
              "gatecep-extraction-user",

            name:
              "Gatecep Extraction User"
          },

          submitForReview,

          allowDuplicate,

          note:
            "Submitted directly from the PC-025E multi-period workspace."
        });

      setSubmissionResult(
        result
      );
    } catch (
      submitError
    ) {
      setSubmissionResult({
        submitted:
          false,

        status:
          "FAILED",

        error:
          submitError?.message ||
          "Submission failed."
      });
    } finally {
      setSubmitting(false);
    }
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
        PC-025E
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Multi-Period Filing Extraction
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Compare several fiscal years, detect duplicate periods,
        validate trends, review source coverage, and generate one
        combined filing-ready record.
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

      <Section
        title="Company and Filing"
        description="Identify the company and source used for the multi-period extraction."
      >
        <Field
          label="Symbol"
          value={
            symbol
          }
          onChangeText={
            setSymbol
          }
        />

        <Field
          label="Company Name"
          value={
            companyName
          }
          onChangeText={
            setCompanyName
          }
        />

        <Field
          label="Filing Type"
          value={
            filingType
          }
          onChangeText={
            setFilingType
          }
        />

        <Field
          label="Source Name"
          value={
            sourceName
          }
          onChangeText={
            setSourceName
          }
        />

        <Field
          label="Source URL"
          value={
            sourceUrl
          }
          onChangeText={
            setSourceUrl
          }
        />
      </Section>

      <Section
        title="Annual Periods JSON"
        description="Enter one normalized annual period object per fiscal year."
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
          value={
            periodsJson
          }
          onChangeText={
            setPeriodsJson
          }
        />
      </Section>

      <Section
        title="Source References JSON"
        description="Optional page and section references with fiscalYear and field."
      >
        <TextInput
          style={
            styles.editorSmall
          }
          multiline
          autoCapitalize="none"
          autoCorrect={
            false
          }
          textAlignVertical="top"
          value={
            referencesJson
          }
          onChangeText={
            setReferencesJson
          }
        />
      </Section>

      <Pressable
        style={
          styles.primaryButton
        }
        onPress={
          runComparison
        }
      >
        <Text
          style={
            styles.primaryButtonText
          }
        >
          Compare Periods and Generate Filing
        </Text>
      </Pressable>

      {comparison ? (
        <>
          <Section
            title="Comparison Summary"
            description="Multi-period validation, completeness, and source coverage."
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
                    comparison?.status
                  )
                }
              />

              <Metric
                label="Periods"
                value={
                  comparison
                    ?.periodCount ||
                  0
                }
              />

              <Metric
                label="Errors"
                value={
                  comparison
                    ?.errors
                    ?.length ||
                  0
                }
              />

              <Metric
                label="Warnings"
                value={
                  comparison
                    ?.warnings
                    ?.length ||
                  0
                }
              />

              <Metric
                label="Completeness"
                value={`${Number(
                  comparison
                    ?.completenessPercentage ||
                  0
                ).toFixed(2)}%`}
              />

              <Metric
                label="Source Coverage"
                value={`${Number(
                  comparison
                    ?.sourceCoverage
                    ?.averageCoveragePercentage ||
                  0
                ).toFixed(2)}%`}
              />
            </View>

            <Text
              style={
                styles.subheading
              }
            >
              Fiscal Years
            </Text>

            <Text
              style={
                styles.bodyText
              }
            >
              {
                comparison
                  ?.fiscalYears
                  ?.join(", ") ||
                "None"
              }
            </Text>
          </Section>

          <Section
            title="Year-over-Year Trends"
            description="Changes calculated from the supplied periods."
          >
            {comparison
              ?.trends
              ?.filter(
                (trend) =>
                  trend
                    ?.changes
                    ?.some(
                      (change) =>
                        change
                          ?.changePercentage !==
                          null &&
                        change
                          ?.changePercentage !==
                          undefined
                    )
              )
              .map(
                (
                  trend,
                  index
                ) => (
                  <TrendCard
                    key={
                      trend?.field ||
                      index
                    }
                    trend={
                      trend
                    }
                  />
                )
              )}
          </Section>

          <Section
            title="Cross-Period Checks"
            description="Duplicate periods, sequence gaps, outliers, share-count changes, dividends, and margins."
          >
            {comparison
              ?.checks
              ?.length ? (
              comparison.checks.map(
                (
                  check,
                  index
                ) => (
                  <CheckCard
                    key={
                      check?.code ||
                      index
                    }
                    check={
                      check
                    }
                  />
                )
              )
            ) : (
              <EmptyState
                title="No Cross-Period Checks"
                message="No check result is available."
              />
            )}
          </Section>

          <Section
            title="Combined Filing-Ready JSON"
            description="Review the combined record, then create a draft or submit it directly for filing review."
          >
            <TextInput
              style={
                styles.output
              }
              multiline
              editable={
                false
              }
              textAlignVertical="top"
              value={
                outputJson
              }
            />

            <View
              style={
                styles.submissionOptions
              }
            >
              <Pressable
                style={[
                  styles.toggleButton,

                  submitForReview &&
                    styles.toggleButtonActive
                ]}
                onPress={() =>
                  setSubmitForReview(
                    (current) =>
                      !current
                  )
                }
              >
                <Text
                  style={
                    styles.toggleButtonText
                  }
                >
                  Submit For Review:{" "}
                  {submitForReview
                    ? "Yes"
                    : "No"}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.toggleButton,

                  allowDuplicate &&
                    styles.toggleButtonWarning
                ]}
                onPress={() =>
                  setAllowDuplicate(
                    (current) =>
                      !current
                  )
                }
              >
                <Text
                  style={
                    styles.toggleButtonText
                  }
                >
                  Duplicate Override:{" "}
                  {allowDuplicate
                    ? "Yes"
                    : "No"}
                </Text>
              </Pressable>
            </View>

            <Pressable
              disabled={
                submitting ||
                !outputJson
              }
              style={[
                styles.primaryButton,

                submitting &&
                  {
                    opacity:
                      0.55
                  }
              ]}
              onPress={
                submitToVerifiedFilings
              }
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                {submitting
                  ? "Submitting..."
                  : submitForReview
                    ? "Send Directly For Review"
                    : "Create Draft In Verified Filings"}
              </Text>
            </Pressable>

            {submissionResult ? (
              <SubmissionReceipt
                result={
                  submissionResult
                }
              />
            ) : null}
          </Section>
        </>
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
          Multi-Year Validation Only
        </Text>

        <Text
          style={
            styles.protectionText
          }
        >
          Unusual changes are flagged for review and are not
          automatically corrected. Approval and repository promotion
          remain controlled by PC-025C.
        </Text>
      </View>

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

function SubmissionReceipt({
  result
}) {
  const filingId =
    result
      ?.receipt
      ?.filingId ||
    result
      ?.filing
      ?.id ||
    null;

  return (
    <View
      style={[
        styles.receiptCard,

        result?.submitted
          ? styles.receiptSuccess
          : styles.receiptWarning
      ]}
    >
      <Text
        style={
          styles.receiptTitle
        }
      >
        Submission Receipt
      </Text>

      <Text
        style={
          styles.receiptText
        }
      >
        Status:{" "}
        {result?.status ||
        "Unknown"}
      </Text>

      <Text
        style={
          styles.receiptText
        }
      >
        Filing ID:{" "}
        {filingId ||
        "Not created"}
      </Text>

      <Text
        style={
          styles.receiptText
        }
      >
        Filing Status:{" "}
        {result
          ?.receipt
          ?.status ||
        result
          ?.filing
          ?.status ||
        "Not available"}
      </Text>

      {result?.error ? (
        <Text
          style={
            styles.receiptError
          }
        >
          {result.error}
        </Text>
      ) : null}

      {filingId ? (
        <Pressable
          style={
            styles.openFilingButton
          }
          onPress={() =>
            router.push({
              pathname:
                "/verified-filings",

              params: {
                filingId
              }
            })
          }
        >
          <Text
            style={
              styles.openFilingButtonText
            }
          >
            Open Created Filing
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function TrendCard({
  trend
}) {
  return (
    <View
      style={
        styles.card
      }
    >
      <Text
        style={
          styles.cardTitle
        }
      >
        {formatLabel(
          trend?.field
        )}
      </Text>

      {trend?.changes?.map(
        (
          change,
          index
        ) => (
          <View
            key={
              `${trend?.field}-${change?.fiscalYear}-${index}`
            }
            style={
              styles.row
            }
          >
            <Text
              style={
                styles.rowLabel
              }
            >
              {
                change
                  ?.previousFiscalYear
              }{" "}
              →{" "}
              {
                change
                  ?.fiscalYear
              }
            </Text>

            <Text
              style={
                styles.rowValue
              }
            >
              {
                change
                  ?.changePercentage ===
                  null ||
                change
                  ?.changePercentage ===
                  undefined
                  ? "Not available"
                  : `${change.changePercentage}%`
              }
            </Text>
          </View>
        )
      )}
    </View>
  );
}

function CheckCard({
  check
}) {
  return (
    <View
      style={[
        styles.card,

        check?.passed
          ? styles.passBorder
          : check?.severity ===
              "ERROR"
            ? styles.errorBorder
            : styles.warningBorder
      ]}
    >
      <Text
        style={
          styles.cardTitle
        }
      >
        {formatLabel(
          check?.code
        )}
      </Text>

      <Text
        style={
          styles.bodyText
        }
      >
        {check?.message}
      </Text>
    </View>
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

      <Text
        style={
          styles.sectionDescription
        }
      >
        {description}
      </Text>

      {children}
    </View>
  );
}

function Field({
  label,
  ...props
}) {
  return (
    <>
      <Text
        style={
          styles.fieldLabel
        }
      >
        {label}
      </Text>

      <TextInput
        style={
          styles.input
        }
        placeholderTextColor="#64748b"
        {...props}
      />
    </>
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

function EmptyState({
  title,
  message
}) {
  return (
    <View
      style={
        styles.card
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
          styles.bodyText
        }
      >
        {message}
      </Text>
    </View>
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
    .replace(
      /([a-z])([A-Z])/g,
      "$1 $2"
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
        10
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

      marginTop:
        16
    },

    errorText: {
      color:
        "#fca5a5"
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
        14
    },

    input: {
      backgroundColor:
        "#020617",

      borderColor:
        "#334155",

      borderWidth:
        1,

      borderRadius:
        13,

      padding:
        13,

      color:
        "white",

      marginTop:
        7
    },

    editor: {
      minHeight:
        430,

      backgroundColor:
        "#020617",

      borderColor:
        "#334155",

      borderWidth:
        1,

      borderRadius:
        14,

      padding:
        14,

      color:
        "#e2e8f0",

      fontFamily:
        "monospace",

      fontSize:
        12,

      lineHeight:
        18,

      marginTop:
        12
    },

    editorSmall: {
      minHeight:
        180,

      backgroundColor:
        "#020617",

      borderColor:
        "#334155",

      borderWidth:
        1,

      borderRadius:
        14,

      padding:
        14,

      color:
        "#e2e8f0",

      fontFamily:
        "monospace",

      fontSize:
        12,

      lineHeight:
        18,

      marginTop:
        12
    },

    primaryButton: {
      backgroundColor:
        "#0891b2",

      padding:
        17,

      borderRadius:
        17,

      marginTop:
        18
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
        14
    },

    secondaryButtonText: {
      color:
        "#67e8f9",

      textAlign:
        "center",

      fontWeight:
        "900"
    },

    metricGrid: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        10,

      marginTop:
        12
    },

    metricCard: {
      width:
        "47%",

      backgroundColor:
        "#020617",

      borderRadius:
        13,

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
        5
    },

    subheading: {
      color:
        "#c084fc",

      fontWeight:
        "900",

      fontSize:
        16,

      marginTop:
        16
    },

    bodyText: {
      color:
        "#cbd5e1",

      lineHeight:
        20,

      marginTop:
        7
    },

    card: {
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

    cardTitle: {
      color:
        "#67e8f9",

      fontWeight:
        "900"
    },

    row: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      gap:
        12,

      marginTop:
        9
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
        "right"
    },

    passBorder: {
      borderColor:
        "rgba(34,197,94,.45)"
    },

    warningBorder: {
      borderColor:
        "rgba(245,158,11,.50)"
    },

    errorBorder: {
      borderColor:
        "rgba(239,68,68,.55)"
    },

    output: {
      minHeight:
        420,

      backgroundColor:
        "#020617",

      borderColor:
        "#334155",

      borderWidth:
        1,

      borderRadius:
        14,

      padding:
        14,

      color:
        "#e2e8f0",

      fontFamily:
        "monospace",

      fontSize:
        12,

      lineHeight:
        18,

      marginTop:
        12
    },

    submissionOptions: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        9,

      marginTop:
        13
    },

    toggleButton: {
      backgroundColor:
        "#334155",

      borderRadius:
        12,

      padding:
        12
    },

    toggleButtonActive: {
      backgroundColor:
        "#15803d"
    },

    toggleButtonWarning: {
      backgroundColor:
        "#b45309"
    },

    toggleButtonText: {
      color:
        "white",

      fontWeight:
        "900"
    },

    receiptCard: {
      backgroundColor:
        "#020617",

      borderWidth:
        1,

      borderRadius:
        14,

      padding:
        14,

      marginTop:
        14
    },

    receiptSuccess: {
      borderColor:
        "rgba(34,197,94,.55)"
    },

    receiptWarning: {
      borderColor:
        "rgba(245,158,11,.55)"
    },

    receiptTitle: {
      color:
        "#67e8f9",

      fontWeight:
        "900"
    },

    receiptText: {
      color:
        "#cbd5e1",

      marginTop:
        7
    },

    receiptError: {
      color:
        "#fca5a5",

      marginTop:
        8
    },

    openFilingButton: {
      backgroundColor:
        "#7c3aed",

      padding:
        13,

      borderRadius:
        12,

      marginTop:
        12
    },

    openFilingButtonText: {
      color:
        "white",

      textAlign:
        "center",

      fontWeight:
        "900"
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
    }
  });
