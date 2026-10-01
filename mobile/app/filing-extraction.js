import React, {
  useMemo,
  useRef,
  useState
} from "react";

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from "react-native";

import {
  router
} from "expo-router";

import {
  buildFilingExtractionWorkspace,
  buildFilingExtractionWorkspaceFromFinancialEvidencePreview,
  buildFilingReadyJson
} from "../src/features/fundamentals/extraction/filingExtractionService";

import {
  submitExtractionWorkspaceToFilings
} from "../src/features/fundamentals/extraction/extractionSubmissionHandoff";

import {
  useAuth
} from "../src/features/auth/hooks/useAuth";

import {
  retrieveIssuerFinancialEvidencePreview
} from "../src/features/fundamentals/api/fundamentalEvidenceApi";

/*
 * ============================================================
 * PC-025D
 * FILING-TO-FUNDAMENTAL EXTRACTION WORKSPACE
 * ============================================================
 *
 * Structured annual-report entry with:
 *
 * - company and filing metadata,
 * - annual period financial values,
 * - source-page references,
 * - reconciliation checks,
 * - filing-ready JSON generation.
 * ============================================================
 */

const PERIOD_FIELDS = [
  "revenue",
  "grossProfit",
  "operatingIncome",
  "ebitda",
  "netIncome",
  "totalAssets",
  "totalLiabilities",
  "totalEquity",
  "cashAndEquivalents",
  "totalDebt",
  "currentAssets",
  "currentLiabilities",
  "operatingCashFlow",
  "capitalExpenditure",
  "freeCashFlow",
  "sharesOutstanding",
  "earningsPerShare",
  "bookValuePerShare",
  "dividendPerShare"
];

// PC-030M20AV3G RESPONSIVE CALIBRATION
export default function FilingExtractionScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const { accessToken } = useAuth();

  const scrollViewRef = useRef(null);
  const extractionValidationYRef = useRef(null);
  const pendingIssuerReviewScrollRef = useRef(false);

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
    fiscalYear,
    setFiscalYear
  ] = useState("");

  const [
    periodEnd,
    setPeriodEnd
  ] = useState("");

  const [
    sourceName,
    setSourceName
  ] = useState("");

  const [
    sourceUrl,
    setSourceUrl
  ] = useState("");

  const [
    fileName,
    setFileName
  ] = useState("");

  const [
    values,
    setValues
  ] = useState(
    buildEmptyValues()
  );

  const [
    references,
    setReferences
  ] = useState(
    buildEmptyReferences()
  );

  const [
    result,
    setResult
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

  // PC-032G5D7C2
  // Qualified issuer/regulator retrieval remains preview-only.
  // It does not populate the manual verified-entry authority,
  // generate filing-ready JSON, or submit a filing.
  const [
    issuerPreviewUrl,
    setIssuerPreviewUrl
  ] = useState("");

  const [
    issuerPreviewLoading,
    setIssuerPreviewLoading
  ] = useState(false);

  const [
    issuerPreviewError,
    setIssuerPreviewError
  ] = useState("");

  const [
    issuerPreview,
    setIssuerPreview
  ] = useState(null);

  const [
    issuerPreviewWorkspace,
    setIssuerPreviewWorkspace
  ] = useState(null);

  const [
    resultOrigin,
    setResultOrigin
  ] = useState("MANUAL");

  const [
    issuerLifecyclePrepared,
    setIssuerLifecyclePrepared
  ] = useState(false);

  const period =
    useMemo(
      () => ({
        fiscalYear:
          parseNumber(
            fiscalYear
          ),

        periodType:
          "ANNUAL",

        periodEnd:
          periodEnd ||
          null,

        currency:
          "KES",

        ...Object.fromEntries(
          PERIOD_FIELDS.map(
            (field) => [
              field,
              parseNumber(
                values?.[field]
              )
            ]
          )
        )
      }),
      [
        fiscalYear,
        periodEnd,
        values
      ]
    );

  const sourceReferences =
    useMemo(
      () =>
        PERIOD_FIELDS
          .map(
            (field) => ({
              field,

              section:
                references
                  ?.[field]
                  ?.section ||
                null,

              page:
                parseNumber(
                  references
                    ?.[field]
                    ?.page
                ),

              note:
                references
                  ?.[field]
                  ?.note ||
                null,

              fiscalYear:
                parseNumber(
                  fiscalYear
                )
            })
          )
          .filter(
            (reference) =>
              reference.page !==
                null ||
              reference.section ||
              reference.note
          ),
      [
        references,
        fiscalYear
      ]
    );

  async function retrieveIssuerPreview() {
    try {
      setIssuerPreviewLoading(true);
      setIssuerPreviewError("");
      setIssuerPreview(null);
      setIssuerPreviewWorkspace(null);

      // Keep the issuer retrieval path completely separate from the
      // manual verified-entry path and any filing submission state.
      setSubmissionResult(null);

      const preview =
        await retrieveIssuerFinancialEvidencePreview({
          accessToken,
          symbol,
          url:
            issuerPreviewUrl
        });

      const workspace =
        buildFilingExtractionWorkspaceFromFinancialEvidencePreview(
          preview
        );

      setIssuerPreview(
        preview
      );

      setIssuerPreviewWorkspace(
        workspace
      );
    } catch (
      previewError
    ) {
      setIssuerPreviewError(
        previewError?.message ||
          "Unable to retrieve issuer financial evidence."
      );
    } finally {
      setIssuerPreviewLoading(false);
    }
  }

  function useIssuerPreviewForReview() {
    if (!issuerPreviewWorkspace) {
      setIssuerPreviewError(
        "Retrieve issuer evidence before opening the PC-025 review workspace."
      );
      return;
    }

    // PC-032G5D7C4
    // This is a review handoff only.
    //
    // The preview workspace remains the authority exactly as produced
    // by the fail-closed financial-evidence adapter. Do not flatten it
    // into the manual verified-entry fields.
    setResult(
      issuerPreviewWorkspace
    );

    setResultOrigin(
      "ISSUER_PREVIEW"
    );

    // A retrieved preview is not filing-ready merely because an
    // investor/reviewer chose to inspect it in the PC-025 workspace.
    setOutputJson("");
    setSubmissionResult(null);
    setIssuerLifecyclePrepared(false);

    // PC-032G5D7C5F
    // Request navigation to the review destination. The actual scroll
    // occurs from that destination's onLayout callback, after React has
    // committed and measured the newly rendered review workspace.
    pendingIssuerReviewScrollRef.current = true;
  }

  function prepareIssuerPreviewForFilingLifecycle() {
    if (
      resultOrigin !== "ISSUER_PREVIEW" ||
      !result
    ) {
      setIssuerPreviewError(
        "Open retrieved issuer evidence in the PC-025 review workspace first."
      );
      return;
    }

    if (
      result?.status !== "READY" ||
      Number(result?.completenessPercentage || 0) < 100 ||
      (Array.isArray(result?.errors) &&
        result.errors.length > 0)
    ) {
      setIssuerPreviewError(
        "Issuer evidence must be READY, 100% complete, and free of extraction errors before entering the filing lifecycle."
      );
      return;
    }

    const filingReady =
      buildFilingReadyJson({
        workspace: result
      });

    setOutputJson(
      JSON.stringify(
        filingReady,
        null,
        2
      )
    );

    setSubmissionResult(null);
    setSubmitForReview(false);
    setAllowDuplicate(false);
    setIssuerLifecyclePrepared(true);
    setIssuerPreviewError("");
  }

  function runValidation() {
    const workspace =
      buildFilingExtractionWorkspace({
        filing: {
          symbol,

          companyName,

          filingType,

          fiscalYear:
            parseNumber(
              fiscalYear
            ),

          periodEnd:
            periodEnd ||
            null,

          sourceDocument: {
            fileName:
              fileName ||
              null,

            mimeType:
              "application/pdf",

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

        periods: [
          period
        ],

        sourceReferences
      });

    setResult(
      workspace
    );

    setResultOrigin(
      "MANUAL"
    );

    setIssuerLifecyclePrepared(false);

    setOutputJson(
      JSON.stringify(
        buildFilingReadyJson({
          workspace
        }),
        null,
        2
      )
    );
  }

  async function submitToVerifiedFilings() {
    try {
      setSubmitting(true);
      setSubmissionResult(null);

      if (!outputJson) {
        throw new Error(
          "Validate the extraction before submitting."
        );
      }

      const result =
        await submitExtractionWorkspaceToFilings({
          filingReadyJson:
            JSON.parse(outputJson),

          workspaceType:
            "SINGLE_PERIOD",

          actor: {
            id:
              "gatecep-extraction-user",

            name:
              "Gatecep Extraction User"
          },

          submitForReview,

          allowDuplicate,

          note:
            "Submitted directly from the PC-025D extraction workspace."
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

  function clearWorkspace() {
    setValues(
      buildEmptyValues()
    );

    setReferences(
      buildEmptyReferences()
    );

    setResult(null);
    setResultOrigin("MANUAL");
    setOutputJson("");
    setSubmissionResult(null);
    setIssuerLifecyclePrepared(false);
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      style={
        styles.screen
      }
      contentContainerStyle={[
        styles.content,
        windowWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
        windowWidth < 720 && { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 },
        windowWidth < 480 && { paddingHorizontal: 12, paddingTop: 24 }
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text
        style={
          styles.eyebrow
        }
      >
        PC-025D
      </Text>

      <Text
        style={[
          styles.title,
          windowWidth < 720 && { fontSize: 28, lineHeight: 34 },
          windowWidth < 480 && { fontSize: 25, lineHeight: 31 }
        ]}
      >
        Filing Extraction Workspace
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Enter verified annual-report values, attach source-page
        references, run accounting checks, and generate filing-ready
        JSON for PC-025B review.
      </Text>

      <Section
        title="Qualified Issuer Evidence Preview"
        description="Retrieve a qualified issuer or regulator PDF for extraction preview. Retrieved evidence remains unverified, non-authoritative, and non-persistent until the separate PC-025 filing lifecycle explicitly reviews it."
      >
        <Field
          label="Issuer / Regulator PDF URL"
          value={
            issuerPreviewUrl
          }
          onChangeText={
            setIssuerPreviewUrl
          }
          autoCapitalize="none"
          autoCorrect={
            false
          }
          placeholder="https://..."
        />

        <Pressable
          disabled={
            issuerPreviewLoading
          }
          style={[
            styles.primaryButton,
            issuerPreviewLoading && {
              opacity:
                0.55
            }
          ]}
          onPress={
            retrieveIssuerPreview
          }
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            {issuerPreviewLoading
              ? "Retrieving Preview..."
              : "Retrieve Issuer Evidence Preview"}
          </Text>
        </Pressable>

        {issuerPreviewError ? (
          <View
            style={
              styles.previewBoundaryCard
            }
          >
            <Text
              style={
                styles.previewBoundaryTitle
              }
            >
              Preview Retrieval Failed
            </Text>

            <Text
              style={
                styles.previewBoundaryText
              }
            >
              {issuerPreviewError}
            </Text>
          </View>
        ) : null}

        {issuerPreview &&
        issuerPreviewWorkspace ? (
          <View
            style={
              styles.previewBoundaryCard
            }
          >
            <Text
              style={
                styles.previewBoundaryTitle
              }
            >
              Issuer Evidence Preview
            </Text>

            <Metric
              label="Symbol"
              value={
                issuerPreview?.symbol ||
                "N/A"
              }
            />

            <Metric
              label="Company"
              value={
                issuerPreview?.companyName ||
                "N/A"
              }
            />

            <Metric
              label="Identity"
              value={
                issuerPreview?.identityStatus ||
                "N/A"
              }
            />

            <Metric
              label="Extraction"
              value={
                issuerPreview?.extractionStatus ||
                "N/A"
              }
            />

            <Metric
              label="Fiscal Year"
              value={
                issuerPreview?.fiscalYear ??
                "N/A"
              }
            />

            <Metric
              label="Period End"
              value={
                issuerPreview?.periodEnd ||
                "N/A"
              }
            />

            <Metric
              label="Evidence Records"
              value={
                Array.isArray(
                  issuerPreview?.evidence
                )
                  ? issuerPreview
                      .evidence
                      .length
                  : 0
              }
            />

            <Metric
              label="Workspace Status"
              value={
                formatLabel(
                  issuerPreviewWorkspace
                    ?.status
                )
              }
            />

            <Metric
              label="Completeness"
              value={`${Number(
                issuerPreviewWorkspace
                  ?.completenessPercentage ||
                  0
              ).toFixed(2)}%`}
            />

            <Text
              style={
                styles.previewBoundaryText
              }
            >
              Preview only | Persistence NONE |
              Unverified | Non-authoritative
            </Text>

            <Text
              style={
                styles.previewBoundaryText
              }
            >
              No filing-ready JSON has been generated
              and no filing has been created or
              submitted.
            </Text>

            <Pressable
              style={[
                styles.secondaryButtonInline,
                {
                  marginTop: 14
                }
              ]}
              onPress={
                useIssuerPreviewForReview
              }
            >
              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                Use This Preview for PC-025 Review
              </Text>
            </Pressable>
          </View>
        ) : null}
      </Section>

      <Section
        title="Filing Information"
        description="Identify the company, fiscal period, and source document."
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
          label="Fiscal Year"
          value={
            fiscalYear
          }
          onChangeText={
            setFiscalYear
          }
          keyboardType="numeric"
        />

        <Field
          label="Period End"
          value={
            periodEnd
          }
          onChangeText={
            setPeriodEnd
          }
          placeholder="YYYY-MM-DD"
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

        <Field
          label="File Name"
          value={
            fileName
          }
          onChangeText={
            setFileName
          }
        />
      </Section>

      <Section
        title="Annual Financial Values"
        description="Use figures exactly as supported by the filing. Leave unsupported values blank."
      >
        {PERIOD_FIELDS.map(
          (field) => (
            <FinancialField
              key={
                field
              }
              field={
                field
              }
              value={
                values?.[field] ||
                ""
              }
              reference={
                references
                  ?.[field] ||
                {}
              }
              onValueChange={
                (next) =>
                  setValues(
                    (current) => ({
                      ...current,

                      [field]:
                        next
                    })
                  )
              }
              onReferenceChange={
                (next) =>
                  setReferences(
                    (current) => ({
                      ...current,

                      [field]: {
                        ...(current
                          ?.[field] ||
                        {}),

                        ...next
                      }
                    })
                  )
              }
            />
          )
        )}
      </Section>

      <View
        style={[
          styles.inlineButtons,
          windowWidth < 520 && { flexDirection: "column", alignItems: "stretch" }
        ]}
      >
        <Pressable
          style={
            styles.primaryButton
          }
          onPress={
            runValidation
          }
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            Validate and Generate JSON
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.secondaryButtonInline
          }
          onPress={
            clearWorkspace
          }
        >
          <Text
            style={
              styles.secondaryButtonText
            }
          >
            Clear Values
          </Text>
        </Pressable>
      </View>

      {result ? (
        <>
          <View
            onLayout={(event) => {
              const reviewY =
                event.nativeEvent.layout.y;

              extractionValidationYRef.current =
                reviewY;

              if (
                pendingIssuerReviewScrollRef.current &&
                resultOrigin === "ISSUER_PREVIEW"
              ) {
                pendingIssuerReviewScrollRef.current =
                  false;

                scrollViewRef.current?.scrollTo({
                  y: Math.max(
                    0,
                    reviewY - 16
                  ),
                  animated: true
                });
              }
            }}
          >
          <Section
            title="Extraction Validation"
            description={
              resultOrigin === "ISSUER_PREVIEW"
                ? "Review retrieved issuer evidence, completeness, errors, warnings, and reconciliation checks. This evidence remains unverified and non-authoritative."
                : "Review completeness, errors, warnings, and reconciliation checks."
            }
          >
            {resultOrigin === "ISSUER_PREVIEW" ? (
              <View
                style={
                  styles.previewBoundaryCard
                }
              >
                <Text
                  style={
                    styles.previewBoundaryTitle
                  }
                >
                  Issuer Evidence Review
                </Text>

                <Text
                  style={
                    styles.previewBoundaryText
                  }
                >
                  Preview only | Persistence NONE |
                  Unverified | Non-authoritative
                </Text>

                <Text
                  style={
                    styles.previewBoundaryText
                  }
                >
                  Reviewing this evidence does not create
                  or submit a filing and does not promote
                  canonical fundamentals.
                </Text>
              </View>
            ) : null}
            <View
              style={
                styles.metricGrid
              }
            >
              <Metric
                label="Status"
                value={
                  formatLabel(
                    result?.status
                  )
                }
              />

              <Metric
                label="Completeness"
                value={`${Number(
                  result
                    ?.completenessPercentage ||
                  0
                ).toFixed(2)}%`}
              />

              <Metric
                label="Errors"
                value={
                  result
                    ?.errors
                    ?.length ||
                  0
                }
              />

              <Metric
                label="Warnings"
                value={
                  result
                    ?.warnings
                    ?.length ||
                  0
                }
              />
            </View>

            {result
              ?.periods?.[0]
              ?.checks?.map(
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
              )}
          </Section>
          </View>

          {resultOrigin === "ISSUER_PREVIEW" &&
          !issuerLifecyclePrepared ? (
            <Section
              title="PC-025 Filing Lifecycle"
              description="The reviewed issuer evidence is still preview-only. Continue only when you deliberately want to prepare this exact reviewed workspace for the existing PC-025 filing lifecycle."
            >
              <Text style={styles.helperText}>
                This step does not create a filing, submit evidence for review,
                verify or approve evidence, or promote canonical fundamentals.
              </Text>

              <Pressable
                style={[
                  styles.primaryButton,
                  {
                    marginTop: 14
                  }
                ]}
                onPress={
                  prepareIssuerPreviewForFilingLifecycle
                }
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Continue to Filing Lifecycle
                </Text>
              </Pressable>
            </Section>
          ) : null}

          {resultOrigin === "MANUAL" ||
          (
            resultOrigin === "ISSUER_PREVIEW" &&
            issuerLifecyclePrepared
          ) ? (
          <Section
            title="Filing-Ready JSON"
            description="Review the generated record, then create a draft or submit it directly for filing review."
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
                {
                  marginTop:
                    14
                },

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
          ) : null}
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
          Source-Controlled Extraction
        </Text>

        <Text
          style={
            styles.protectionText
          }
        >
          This workspace validates structured entries but does not
          infer or manufacture missing financial facts. Filing approval
          still occurs in PC-025C.
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

function FinancialField({
  field,
  value,
  reference,
  onValueChange,
  onReferenceChange
}) {
  return (
    <View
      style={
        styles.financialCard
      }
    >
      <Text
        style={
          styles.cardTitle
        }
      >
        {formatLabel(
          field
        )}
      </Text>

      <TextInput
        style={
          styles.input
        }
        keyboardType="numeric"
        placeholder="Financial value"
        placeholderTextColor="#64748b"
        value={
          value
        }
        onChangeText={
          onValueChange
        }
      />

      <View
        style={
          styles.referenceRow
        }
      >
        <TextInput
          style={
            styles.referenceInput
          }
          keyboardType="numeric"
          placeholder="Page"
          placeholderTextColor="#64748b"
          value={
            reference?.page ||
            ""
          }
          onChangeText={
            (page) =>
              onReferenceChange({
                page
              })
          }
        />

        <TextInput
          style={
            styles.referenceInputWide
          }
          placeholder="Section"
          placeholderTextColor="#64748b"
          value={
            reference?.section ||
            ""
          }
          onChangeText={
            (section) =>
              onReferenceChange({
                section
              })
          }
        />
      </View>
    </View>
  );
}

function CheckCard({
  check
}) {
  return (
    <View
      style={[
        styles.checkCard,

        check?.passed
          ? styles.checkPassed
          : check?.severity ===
              "ERROR"
            ? styles.checkError
            : styles.checkWarning
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
          styles.cardText
        }
      >
        {check?.message}
      </Text>

      {check
        ?.differencePercentage !==
        null &&
      check
        ?.differencePercentage !==
        undefined ? (
        <Text
          style={
            styles.metaText
          }
        >
          Difference:{" "}
          {
            check
              .differencePercentage
          }
          %
        </Text>
      ) : null}
    </View>
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

function buildEmptyValues() {
  return Object.fromEntries(
    PERIOD_FIELDS.map(
      (field) => [
        field,
        ""
      ]
    )
  );
}

function buildEmptyReferences() {
  return Object.fromEntries(
    PERIOD_FIELDS.map(
      (field) => [
        field,
        {
          page:
            "",

          section:
            "",

          note:
            ""
        }
      ]
    )
  );
}

function parseNumber(value) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() ===
      ""
  ) {
    return null;
  }

  const parsed =
    Number(
      String(value)
        .replaceAll(",", "")
        .trim()
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
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

    financialCard: {
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
        12
    },

    cardTitle: {
      color:
        "#67e8f9",

      fontWeight:
        "900"
    },

    cardText: {
      color:
        "#cbd5e1",

      lineHeight:
        20,

      marginTop:
        7
    },

    referenceRow: {
      flexDirection:
        "row",

      gap:
        8,

      marginTop:
        8
    },

    referenceInput: {
      width:
        "28%",

      backgroundColor:
        "#0f172a",

      borderColor:
        "#334155",

      borderWidth:
        1,

      borderRadius:
        11,

      padding:
        11,

      color:
        "white"
    },

    referenceInputWide: {
      flex:
        1,

      backgroundColor:
        "#0f172a",

      borderColor:
        "#334155",

      borderWidth:
        1,

      borderRadius:
        11,

      padding:
        11,

      color:
        "white"
    },

    inlineButtons: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        10,

      marginTop:
        18
    },

    primaryButton: {
      flex:
        1,

      minWidth:
        190,

      backgroundColor:
        "#0891b2",

      padding:
        16,

      borderRadius:
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

    secondaryButtonInline: {
      backgroundColor:
        "#334155",

      padding:
        16,

      borderRadius:
        15
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

    checkCard: {
      backgroundColor:
        "#020617",

      borderWidth:
        1,

      borderRadius:
        13,

      padding:
        13,

      marginTop:
        10
    },

    checkPassed: {
      borderColor:
        "rgba(34,197,94,.45)"
    },

    checkWarning: {
      borderColor:
        "rgba(245,158,11,.50)"
    },

    checkError: {
      borderColor:
        "rgba(239,68,68,.55)"
    },

    metaText: {
      color:
        "#94a3b8",

      fontSize:
        11,

      marginTop:
        6
    },

    output: {
      minHeight:
        360,

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
    },
    previewBoundaryCard: {
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 14,
    backgroundColor: "#0f172a"
  },

  previewBoundaryTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10
  },

  previewBoundaryText: {
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10
  },

});
