import React, {
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

import {
  router
} from "expo-router";

import {
  FILING_BRIDGE_SUBMISSION_MODES,
  FILING_BRIDGE_SOURCE_WORKSPACES,
  previewFilingBridgeSubmission,
  submitFilingReadyPayload
} from "../src/features/fundamentals/filings/filingImportBridgeService";

/*
 * ============================================================
 * PC-025F
 * FILING IMPORT BRIDGE DASHBOARD
 * ============================================================
 *
 * Allows direct submission of filing-ready JSON into the
 * verified-filing repository without manual navigation between
 * extraction and review screens.
 * ============================================================
 */

export default function FilingImportBridgeScreen() {
  const [
    payloadText,
    setPayloadText
  ] = useState("");

  const [
    sourceWorkspace,
    setSourceWorkspace
  ] = useState(
    FILING_BRIDGE_SOURCE_WORKSPACES
      .SINGLE_PERIOD
  );

  const [
    submissionMode,
    setSubmissionMode
  ] = useState(
    FILING_BRIDGE_SUBMISSION_MODES
      .CREATE_DRAFT
  );

  const [
    reviewerName,
    setReviewerName
  ] = useState(
    "Gatecep Extraction User"
  );

  const [
    allowDuplicate,
    setAllowDuplicate
  ] = useState(false);

  const [
    working,
    setWorking
  ] = useState(false);

  const [
    result,
    setResult
  ] = useState(null);

  const [
    error,
    setError
  ] = useState("");

  async function previewSubmission() {
    try {
      setWorking(true);
      setError("");

      const payload =
        JSON.parse(
          payloadText
        );

      setResult(
        await previewFilingBridgeSubmission({
          payload,
          sourceWorkspace
        })
      );
    } catch (
      previewError
    ) {
      setError(
        previewError?.message ||
        "Unable to preview the filing submission."
      );
    } finally {
      setWorking(false);
    }
  }

  async function submitPayload() {
    try {
      setWorking(true);
      setError("");

      const payload =
        JSON.parse(
          payloadText
        );

      setResult(
        await submitFilingReadyPayload({
          payload,
          sourceWorkspace,
          submissionMode,
          allowDuplicate,

          actor: {
            id:
              reviewerName,

            name:
              reviewerName
          }
        })
      );
    } catch (
      submitError
    ) {
      setError(
        submitError?.message ||
        "Unable to submit the filing."
      );
    } finally {
      setWorking(false);
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
        PC-025F
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Filing Import Bridge
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Preview and submit filing-ready JSON directly into the
        verified-filing repository.
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
        title="Submission Configuration"
        description="Choose the source workspace and target filing lifecycle state."
      >
        <Text
          style={
            styles.label
          }
        >
          Source Workspace
        </Text>

        <Option
          label="PC-025D Single Period"
          active={
            sourceWorkspace ===
            FILING_BRIDGE_SOURCE_WORKSPACES
              .SINGLE_PERIOD
          }
          onPress={() =>
            setSourceWorkspace(
              FILING_BRIDGE_SOURCE_WORKSPACES
                .SINGLE_PERIOD
            )
          }
        />

        <Option
          label="PC-025E Multi Period"
          active={
            sourceWorkspace ===
            FILING_BRIDGE_SOURCE_WORKSPACES
              .MULTI_PERIOD
          }
          onPress={() =>
            setSourceWorkspace(
              FILING_BRIDGE_SOURCE_WORKSPACES
                .MULTI_PERIOD
            )
          }
        />

        <Text
          style={
            styles.label
          }
        >
          Submission Mode
        </Text>

        <Option
          label="Create Draft"
          active={
            submissionMode ===
            FILING_BRIDGE_SUBMISSION_MODES
              .CREATE_DRAFT
          }
          onPress={() =>
            setSubmissionMode(
              FILING_BRIDGE_SUBMISSION_MODES
                .CREATE_DRAFT
            )
          }
        />

        <Option
          label="Create and Submit for Review"
          active={
            submissionMode ===
            FILING_BRIDGE_SUBMISSION_MODES
              .CREATE_AND_SUBMIT_FOR_REVIEW
          }
          onPress={() =>
            setSubmissionMode(
              FILING_BRIDGE_SUBMISSION_MODES
                .CREATE_AND_SUBMIT_FOR_REVIEW
            )
          }
        />

        <Text
          style={
            styles.label
          }
        >
          Submitted By
        </Text>

        <TextInput
          style={
            styles.input
          }
          value={
            reviewerName
          }
          onChangeText={
            setReviewerName
          }
        />

        <Option
          label={`Allow Duplicate Override: ${
            allowDuplicate
              ? "Yes"
              : "No"
          }`}
          active={
            allowDuplicate
          }
          onPress={() =>
            setAllowDuplicate(
              (current) =>
                !current
            )
          }
        />
      </Section>

      <Section
        title="Filing-Ready JSON"
        description="Paste output from PC-025D or PC-025E."
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
          placeholder="Paste filing-ready JSON..."
          placeholderTextColor="#64748b"
          value={
            payloadText
          }
          onChangeText={
            setPayloadText
          }
        />

        <View
          style={
            styles.actions
          }
        >
          <Pressable
            disabled={
              working
            }
            style={
              styles.previewButton
            }
            onPress={
              previewSubmission
            }
          >
            <Text
              style={
                styles.buttonText
              }
            >
              Preview
            </Text>
          </Pressable>

          <Pressable
            disabled={
              working
            }
            style={
              styles.submitButton
            }
            onPress={
              submitPayload
            }
          >
            {working ? (
              <ActivityIndicator
                color="white"
              />
            ) : (
              <Text
                style={
                  styles.buttonText
                }
              >
                Submit
              </Text>
            )}
          </Pressable>
        </View>
      </Section>

      {result ? (
        <Section
          title="Bridge Result"
          description="Validation, duplicate review, and submission receipt."
        >
          <Row
            label="Status"
            value={
              result?.status ||
              "Unknown"
            }
          />

          <Row
            label="Submitted"
            value={
              result?.submitted
                ? "Yes"
                : "No"
            }
          />

          <Row
            label="Symbol"
            value={
              result
                ?.validation
                ?.symbol ||
              result
                ?.receipt
                ?.symbol ||
              "Not available"
            }
          />

          <Row
            label="Duplicate Status"
            value={
              result
                ?.duplicate
                ?.status ||
              "Not available"
            }
          />

          <Row
            label="Filing ID"
            value={
              result
                ?.receipt
                ?.filingId ||
              "Not created"
            }
          />

          <Row
            label="Filing Status"
            value={
              result
                ?.receipt
                ?.status ||
              "Not available"
            }
          />

          {result
            ?.validation
            ?.errors?.map(
              (
                issue,
                index
              ) => (
                <Issue
                  key={
                    issue?.code ||
                    index
                  }
                  issue={
                    issue
                  }
                  danger
                />
              )
            )}

          {result
            ?.validation
            ?.warnings?.map(
              (
                issue,
                index
              ) => (
                <Issue
                  key={
                    issue?.code ||
                    index
                  }
                  issue={
                    issue
                  }
                />
              )
            )}
        </Section>
      ) : null}

      <View
        style={
          styles.protection
        }
      >
        <Text
          style={
            styles.protectionTitle
          }
        >
          No Automatic Approval
        </Text>

        <Text
          style={
            styles.protectionText
          }
        >
          This bridge can create a draft or submit a filing for
          review. It never verifies, approves, or promotes financial
          data automatically.
        </Text>
      </View>

      <Pressable
        style={
          styles.backButton
        }
        onPress={() =>
          router.replace("/fundamental-data-hub")
        }
      >
        <Text
          style={
            styles.backText
          }
        >
          Back
        </Text>
      </Pressable>
    </ScrollView>
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

function Option({
  label,
  active,
  onPress
}) {
  return (
    <Pressable
      style={[
        styles.option,

        active &&
          styles.optionActive
      ]}
      onPress={
        onPress
      }
    >
      <Text
        style={[
          styles.optionText,

          active &&
            styles.optionTextActive
        ]}
      >
        {label}
      </Text>
    </Pressable>
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
        {String(value)}
      </Text>
    </View>
  );
}

function Issue({
  issue,
  danger = false
}) {
  return (
    <View
      style={[
        styles.issue,

        danger &&
          styles.issueDanger
      ]}
    >
      <Text
        style={
          danger
            ? styles.issueTitleDanger
            : styles.issueTitle
        }
      >
        {
          issue?.code ||
          "Issue"
        }
      </Text>

      <Text
        style={
          styles.issueText
        }
      >
        {
          issue?.message ||
          "No description"
        }
      </Text>
    </View>
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
        8
    },

    label: {
      color:
        "#cbd5e1",

      fontWeight:
        "900",

      marginTop:
        14
    },

    option: {
      backgroundColor:
        "#1e293b",

      borderRadius:
        12,

      padding:
        12,

      marginTop:
        8
    },

    optionActive: {
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
        8
    },

    editor: {
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
        10
    },

    actions: {
      flexDirection:
        "row",

      gap:
        10,

      marginTop:
        14
    },

    previewButton: {
      flex:
        1,

      backgroundColor:
        "#7c3aed",

      padding:
        15,

      borderRadius:
        14
    },

    submitButton: {
      flex:
        1,

      backgroundColor:
        "#0891b2",

      padding:
        15,

      borderRadius:
        14
    },

    buttonText: {
      color:
        "white",

      textAlign:
        "center",

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

    issue: {
      backgroundColor:
        "#020617",

      borderColor:
        "rgba(245,158,11,.45)",

      borderWidth:
        1,

      borderRadius:
        13,

      padding:
        13,

      marginTop:
        10
    },

    issueDanger: {
      borderColor:
        "rgba(239,68,68,.55)"
    },

    issueTitle: {
      color:
        "#fde68a",

      fontWeight:
        "900"
    },

    issueTitleDanger: {
      color:
        "#fca5a5",

      fontWeight:
        "900"
    },

    issueText: {
      color:
        "#cbd5e1",

      marginTop:
        6
    },

    protection: {
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

    backButton: {
      backgroundColor:
        "#1e293b",

      padding:
        16,

      borderRadius:
        17,

      marginTop:
        14
    },

    backText: {
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

      marginTop:
        16
    },

    errorText: {
      color:
        "#fca5a5"
    }
  });
