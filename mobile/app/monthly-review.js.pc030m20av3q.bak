import React, {
  useEffect,
  useState
} from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";

import {
  buildMonthlyReview
} from "../src/features/monthly-review/monthlyReviewService";

import {
  getReviewMonth,
  getMonthlyReview,
  saveMonthlyReview
} from "../src/features/monthly-review/monthlyReviewStore";

export default function MonthlyReview() {
  const params = useLocalSearchParams();
  const returnsToTimeline = String(params?.returnTo || "").toLowerCase() === "timeline";
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    review,
    setReview
  ] = useState(null);

  const [
    savedSnapshot,
    setSavedSnapshot
  ] = useState(null);

  const [
    savingSnapshot,
    setSavingSnapshot
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  useEffect(() => {
    loadReview();
  }, []);

  /*
   * ==========================================================
   * LOAD CURRENT MONTHLY REVIEW
   * ==========================================================
   */

  async function loadReview() {
    try {
      setLoading(true);
      setError("");

      const result =
        await buildMonthlyReview();

      setReview(result);

      const reviewMonth =
        getReviewMonth(
          result?.generatedAt ||
          new Date()
        );

      if (!reviewMonth) {
        setSavedSnapshot(null);
        return;
      }

      const existing =
        await getMonthlyReview(
          reviewMonth
        );

      setSavedSnapshot(
        existing
      );
    } catch (err) {
      console.error(
        "Unable to build monthly review:",
        err
      );

      setError(
        err?.message ||
          "Coach G could not prepare your monthly review."
      );

      setReview(null);
      setSavedSnapshot(null);
    } finally {
      setLoading(false);
    }
  }

  /*
   * ==========================================================
   * SAVE / UPDATE CURRENT MONTH SNAPSHOT
   * ==========================================================
   *
   * The store is idempotent by month.
   *
   * Saving July 2026 again updates 2026-07
   * instead of creating another July record.
   */

  async function saveCurrentReview() {
    if (!review) {
      return;
    }

    try {
      setSavingSnapshot(true);
      setError("");

      const saved =
        await saveMonthlyReview(
          review
        );

      setSavedSnapshot(
        saved
      );
    } catch (err) {
      console.error(
        "Unable to save monthly review:",
        err
      );

      setError(
        err?.message ||
          "Coach G could not save this monthly review."
      );
    } finally {
      setSavingSnapshot(false);
    }
  }

  /*
   * ==========================================================
   * LOADING STATE
   * ==========================================================
   */

  if (loading) {
    return (
      <View
        style={styles.center}
      >
        <ActivityIndicator
          size="large"
          color="#67e8f9"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Coach G is reviewing your month...
        </Text>
      </View>
    );
  }

  /*
   * ==========================================================
   * SCREEN
   * ==========================================================
   */

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.content
      }
    >
      <Text
        style={styles.eyebrow}
      >
        PC-006
      </Text>

      <Text
        style={styles.title}
      >
        Coach G Monthly Review
      </Text>

      {error ? (
        <View
          style={styles.errorCard}
        >
          <Text
            style={styles.errorText}
          >
            {error}
          </Text>
        </View>
      ) : null}

      {review ? (
        <>
          {/*
           * ==================================================
           * COACH G HEADLINE
           * ==================================================
           */}

          <View
            style={
              styles.coachCard
            }
          >
            <Text
              style={
                styles.cardLabel
              }
            >
              COACH G
            </Text>

            <Text
              style={
                styles.coachHeadline
              }
            >
              {
                review?.coachG
                  ?.headline ||
                "Let's review your progress."
              }
            </Text>
          </View>

          {/*
           * ==================================================
           * PORTFOLIO METRICS
           * ==================================================
           */}

          <View
            style={
              styles.metricGrid
            }
          >
            <Metric
              label="REAL Portfolio Value"
              value={`KES ${money(
                review?.portfolio
                  ?.totalRealValue
              )}`}
            />

            <Metric
              label="Invested"
              value={`KES ${money(
                review?.portfolio
                  ?.investedAmount
              )}`}
            />

            <Metric
              label="Available Cash"
              value={`KES ${money(
                review?.portfolio
                  ?.availableCash
              )}`}
            />

            <Metric
              label="Holdings"
              value={
                review?.portfolio
                  ?.holdingsCount ||
                0
              }
            />
          </View>

          {/*
           * ==================================================
           * PORTFOLIO REVIEW
           * ==================================================
           */}

          <ReviewCard
            title="Portfolio Review"
            text={
              review?.coachG
                ?.portfolioMessage ||
              "Coach G is still preparing your portfolio review."
            }
          />

          {/*
           * ==================================================
           * DECISION BEHAVIOR
           * ==================================================
           */}

          <ReviewCard
            title="Decision Behavior"
            text={
              review?.coachG
                ?.behaviorMessage ||
              "Record investment decisions so Coach G can help you understand your behavior over time."
            }
          />

          {/*
           * ==================================================
           * THIS MONTH
           * ==================================================
           */}

          <View
            style={styles.card}
          >
            <Text
              style={
                styles.cardTitle
              }
            >
              This Month
            </Text>

            <Row
              label="Decisions Recorded"
              value={
                review?.decisions
                  ?.monthlyCount ||
                0
              }
            />

            <Row
              label="Average Confidence"
              value={`${Number(
                review?.decisions
                  ?.confidenceAverage ||
                0
              ).toFixed(1)} / 5`}
            />

            <Row
              label="Most Reviewed"
              value={
                review?.decisions
                  ?.mostReviewedSymbol ||
                "None yet"
              }
            />

            <Row
              label="Total Decisions"
              value={
                review?.decisions
                  ?.totalCount ||
                0
              }
            />
          </View>

          {/*
           * ==================================================
           * COACH G NEXT FOCUS
           * ==================================================
           */}

          <View
            style={
              styles.focusCard
            }
          >
            <Text
              style={
                styles.focusTitle
              }
            >
              Coach G's Next Focus
            </Text>

            <Text
              style={
                styles.focusText
              }
            >
              {
                review?.coachG
                  ?.nextFocus ||
                "Stay focused on your long-term investment plan."
              }
            </Text>
          </View>

          {/*
           * ==================================================
           * INVESTOR FOUNDATION
           * ==================================================
           */}

          <View
            style={styles.card}
          >
            <Text
              style={
                styles.cardTitle
              }
            >
              Investor Foundation
            </Text>

            <Row
              label="Investor Type"
              value={
                review?.investor
                  ?.investorType ||
                "Developing Investor"
              }
            />

            <Row
              label="Risk Profile"
              value={
                review?.investor
                  ?.riskProfile ||
                "Not set"
              }
            />

            <Row
              label="Goal"
              value={
                review?.investor
                  ?.goal ||
                "Not set"
              }
            />
          </View>

          {/*
           * ==================================================
           * SAVED SNAPSHOT STATUS
           * ==================================================
           */}

          {savedSnapshot ? (
            <View
              style={
                styles.savedCard
              }
            >
              <Text
                style={
                  styles.savedTitle
                }
              >
                Monthly Snapshot Saved
              </Text>

              <Text
                style={
                  styles.savedText
                }
              >
                Coach G has saved the review
                for{" "}
                {formatReviewMonth(
                  savedSnapshot.reviewMonth
                )}
                .
              </Text>

              <Text
                style={
                  styles.savedSubtext
                }
              >
                Saving again during this
                month will update the same
                monthly snapshot instead of
                creating a duplicate.
              </Text>
            </View>
          ) : null}

          {/*
           * ==================================================
           * SAVE SNAPSHOT
           * ==================================================
           */}

          <Pressable
            style={[
              styles.saveButton,
              savingSnapshot &&
                styles.disabledButton
            ]}
            disabled={
              savingSnapshot ||
              !review
            }
            onPress={
              saveCurrentReview
            }
          >
            {savingSnapshot ? (
              <ActivityIndicator
                color="white"
              />
            ) : (
              <Text
                style={
                  styles.saveButtonText
                }
              >
                {savedSnapshot
                  ? "Update This Month's Review"
                  : "Save This Month's Review"}
              </Text>
            )}
          </Pressable>
        </>
      ) : (
        <View
          style={styles.emptyCard}
        >
          <Text
            style={styles.emptyTitle}
          >
            Monthly Review Not Available
          </Text>

          <Text
            style={styles.emptyText}
          >
            Coach G could not find enough
            investor information to prepare
            this month's review.
          </Text>
        </View>
      )}

      {/*
       * ======================================================
       * REFRESH
       * ======================================================
       */}

      <Pressable
        style={
          styles.primaryButton
        }
        onPress={loadReview}
      >
        <Text
          style={
            styles.primaryButtonText
          }
        >
          Refresh Monthly Review
        </Text>
      </Pressable>

      {/*
       * ======================================================
       * BACK TO DASHBOARD
       * ======================================================
       */}

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.replace(returnsToTimeline ? "/investor-timeline" : "/(tabs)/dashboard")
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          {returnsToTimeline ? "Back to Investor Timeline" : "Back to Home"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

/*
 * ============================================================
 * METRIC
 * ============================================================
 */

function Metric({
  label,
  value
}) {
  return (
    <View
      style={styles.metric}
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
          value ?? "N/A"
        )}
      </Text>
    </View>
  );
}

/*
 * ============================================================
 * REVIEW CARD
 * ============================================================
 */

function ReviewCard({
  title,
  text
}) {
  return (
    <View
      style={styles.card}
    >
      <Text
        style={
          styles.cardTitle
        }
      >
        {title}
      </Text>

      <Text
        style={styles.bodyText}
      >
        {text}
      </Text>
    </View>
  );
}

/*
 * ============================================================
 * ROW
 * ============================================================
 */

function Row({
  label,
  value
}) {
  return (
    <View
      style={styles.row}
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
          value ?? "N/A"
        )}
      </Text>
    </View>
  );
}

/*
 * ============================================================
 * MONEY
 * ============================================================
 */

function money(value) {
  return Number(
    value || 0
  ).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}

/*
 * ============================================================
 * REVIEW MONTH FORMATTER
 * ============================================================
 */

function formatReviewMonth(
  reviewMonth
) {
  if (!reviewMonth) {
    return "this month";
  }

  const [
    year,
    month
  ] = String(
    reviewMonth
  ).split("-");

  const monthNumber =
    Number(month);

  const yearNumber =
    Number(year);

  if (
    !Number.isFinite(
      monthNumber
    ) ||
    !Number.isFinite(
      yearNumber
    )
  ) {
    return reviewMonth;
  }

  const date =
    new Date(
      yearNumber,
      monthNumber - 1,
      1
    );

  return date.toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric"
    }
  );
}

/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        "#020617"
    },

    content: {
      padding: 22,
      paddingTop: 70,
      paddingBottom: 110
    },

    center: {
      flex: 1,
      backgroundColor:
        "#020617",
      alignItems:
        "center",
      justifyContent:
        "center",
      padding: 24
    },

    loadingText: {
      color: "#94a3b8",
      marginTop: 14
    },

    eyebrow: {
      color: "#c084fc",
      fontWeight: "900",
      fontSize: 13,
      letterSpacing: 1.2
    },

    title: {
      color: "white",
      fontSize: 30,
      fontWeight: "900",
      marginTop: 8,
      marginBottom: 20
    },

    /*
     * Coach G
     */

    coachCard: {
      backgroundColor:
        "rgba(147,51,234,.12)",
      borderColor:
        "rgba(147,51,234,.35)",
      borderWidth: 1,
      borderRadius: 22,
      padding: 18
    },

    cardLabel: {
      color: "#c084fc",
      fontSize: 12,
      fontWeight: "900"
    },

    coachHeadline: {
      color: "white",
      fontSize: 20,
      fontWeight: "900",
      lineHeight: 28,
      marginTop: 8
    },

    /*
     * Metrics
     */

    metricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 18
    },

    metric: {
      width: "47%",
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 18,
      padding: 15
    },

    metricLabel: {
      color: "#94a3b8",
      fontSize: 12
    },

    metricValue: {
      color: "white",
      fontSize: 17,
      fontWeight: "900",
      marginTop: 6
    },

    /*
     * Generic cards
     */

    card: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18,
      marginTop: 16
    },

    cardTitle: {
      color: "#67e8f9",
      fontSize: 18,
      fontWeight: "900"
    },

    bodyText: {
      color: "#cbd5e1",
      lineHeight: 22,
      marginTop: 10
    },

    /*
     * Rows
     */

    row: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "flex-start",
      gap: 16,
      marginTop: 14
    },

    rowLabel: {
      color: "#94a3b8",
      flex: 1
    },

    rowValue: {
      color: "white",
      fontWeight: "900",
      textAlign: "right",
      flex: 1
    },

    /*
     * Coach G next focus
     */

    focusCard: {
      backgroundColor:
        "rgba(34,197,94,.10)",
      borderColor:
        "rgba(34,197,94,.35)",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18,
      marginTop: 16
    },

    focusTitle: {
      color: "#86efac",
      fontSize: 18,
      fontWeight: "900"
    },

    focusText: {
      color: "#bbf7d0",
      lineHeight: 22,
      marginTop: 10
    },

    /*
     * Saved monthly snapshot
     */

    savedCard: {
      backgroundColor:
        "rgba(34,197,94,.10)",
      borderColor:
        "rgba(34,197,94,.35)",
      borderWidth: 1,
      borderRadius: 18,
      padding: 16,
      marginTop: 18
    },

    savedTitle: {
      color: "#86efac",
      fontSize: 17,
      fontWeight: "900"
    },

    savedText: {
      color: "#bbf7d0",
      lineHeight: 21,
      marginTop: 8
    },

    savedSubtext: {
      color: "#86efac",
      lineHeight: 20,
      marginTop: 8,
      opacity: 0.9
    },

    /*
     * Save button
     */

    saveButton: {
      backgroundColor:
        "#16a34a",
      padding: 17,
      borderRadius: 18,
      marginTop: 22
    },

    saveButtonText: {
      color: "white",
      fontWeight: "900",
      textAlign: "center"
    },

    disabledButton: {
      opacity: 0.6
    },

    /*
     * Refresh button
     */

    primaryButton: {
      backgroundColor:
        "#9333ea",
      padding: 17,
      borderRadius: 18,
      marginTop: 12
    },

    primaryButtonText: {
      color: "white",
      fontWeight: "900",
      textAlign: "center"
    },

    /*
     * Dashboard button
     */

    secondaryButton: {
      backgroundColor:
        "#1e293b",
      padding: 17,
      borderRadius: 18,
      marginTop: 12
    },

    secondaryButtonText: {
      color: "#67e8f9",
      fontWeight: "900",
      textAlign: "center"
    },

    /*
     * Error
     */

    errorCard: {
      backgroundColor:
        "rgba(239,68,68,.10)",
      borderColor:
        "rgba(239,68,68,.35)",
      borderWidth: 1,
      borderRadius: 18,
      padding: 16,
      marginBottom: 16
    },

    errorText: {
      color: "#fca5a5"
    },

    /*
     * Empty state
     */

    emptyCard: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18
    },

    emptyTitle: {
      color: "#67e8f9",
      fontSize: 18,
      fontWeight: "900"
    },

    emptyText: {
      color: "#94a3b8",
      lineHeight: 22,
      marginTop: 10
    }
  });
