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
  View
} from "react-native";

import {
  router
} from "expo-router";

import {
  buildCorporateActionInvestorExperience
} from "../src/features/corporate-actions/corporateActionExperienceService";

/*
 * ============================================================
 * PC-027I
 * INVESTOR CORPORATE ACTION EXPERIENCE
 * ============================================================
 *
 * This is intentionally NOT a technical corporate-action console.
 *
 * It shows:
 * - what affects the investor,
 * - expected income,
 * - decisions requiring discussion,
 * - important share changes,
 * - Coach G's next-best action.
 *
 * The engines remain underneath.
 * ============================================================
 */

export default function CorporateActionsScreen() {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    experience,
    setExperience
  ] = useState(null);

  const [
    error,
    setError
  ] = useState("");

  const loadExperience =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          /*
           * PC-027I default:
           * corporate actions are read from the PC-027A registry.
           *
           * When the investor-session orchestration layer is connected,
           * pass real holdings, portfolio and Investor DNA context here.
           */
          const result =
            await buildCorporateActionInvestorExperience();

          setExperience(
            result
          );
        } catch (
          loadError
        ) {
          setError(
            loadError?.message ||
            "Unable to load corporate actions."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(
    () => {
      loadExperience();
    },
    [
      loadExperience
    ]
  );

  if (loading) {
    return (
      <View
        style={
          styles.center
        }
      >
        <ActivityIndicator
          size="large"
          color="#22d3ee"
        />

        <Text
          style={
            styles.muted
          }
        >
          Coach G is checking your investments...
        </Text>
      </View>
    );
  }

  const advice =
    experience?.advice ||
    [];

  return (
    <ScrollView
      style={
        styles.screen
      }
      contentContainerStyle={
        styles.content
      }
    >
      <Text
        style={
          styles.eyebrow
        }
      >
        COACH G
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Corporate Actions
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Company events that may affect your income, shares,
        portfolio or investment decisions.
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
          styles.summary
        }
      >
        <SummaryMetric
          label="Being monitored"
          value={
            experience?.summary?.total ||
            0
          }
        />

        <SummaryMetric
          label="Need attention"
          value={
            experience?.summary?.highPriority ||
            0
          }
        />

        <SummaryMetric
          label="Decisions"
          value={
            experience?.summary?.decisionRequired ||
            0
          }
        />

        <SummaryMetric
          label="Income events"
          value={
            experience?.summary?.expectedIncomeEvents ||
            0
          }
        />
      </View>

      {experience
        ?.coachGPrompt
        ?.shouldSurface ? (
        <View
          style={
            styles.coachCard
          }
        >
          <Text
            style={
              styles.coachLabel
            }
          >
            Coach G's Priority
          </Text>

          <Text
            style={
              styles.coachTitle
            }
          >
            {
              experience
                .coachGPrompt
                .title
            }
          </Text>

          <Text
            style={
              styles.coachText
            }
          >
            {
              experience
                .coachGPrompt
                .message
            }
          </Text>

          {experience
            .coachGPrompt
            .suggestedQuestion ? (
            <View
              style={
                styles.question
              }
            >
              <Text
                style={
                  styles.questionLabel
                }
              >
                Ask Coach G:
              </Text>

              <Text
                style={
                  styles.questionText
                }
              >
                {
                  experience
                    .coachGPrompt
                    .suggestedQuestion
                }
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <Section
        title="What Needs Your Attention"
        description="Only items where Coach G sees a decision, missing evidence, overdue payment, or other important issue."
      >
        {experience
          ?.attentionItems
          ?.length ? (
          experience
            .attentionItems
            .map(
              (item) => (
                <ActionCard
                  key={
                    item
                      ?.event
                      ?.actionId
                  }
                  item={
                    item
                  }
                />
              )
            )
        ) : (
          <EmptyState
            message="Nothing currently needs your attention."
          />
        )}
      </Section>

      <Section
        title="Expected Income"
        description="Cash corporate actions Coach G is monitoring for you."
      >
        {experience
          ?.incomeItems
          ?.length ? (
          experience
            .incomeItems
            .map(
              (item) => (
                <ActionCard
                  key={
                    `income-${item?.event?.actionId}`
                  }
                  item={
                    item
                  }
                />
              )
            )
        ) : (
          <EmptyState
            message="No expected corporate-action income is currently recorded."
          />
        )}
      </Section>

      <Section
        title="All Corporate Actions"
        description="Events affecting investments in your portfolio."
      >
        {advice.length ? (
          advice.map(
            (item) => (
              <ActionCard
                key={
                  `all-${item?.event?.actionId}`
                }
                item={
                  item
                }
              />
            )
          )
        ) : (
          <EmptyState
            message="No investor-relevant corporate actions are currently available."
          />
        )}
      </Section>

      <View
        style={
          styles.notice
        }
      >
        <Text
          style={
            styles.noticeTitle
          }
        >
          You stay in control
        </Text>

        <Text
          style={
            styles.noticeText
          }
        >
          Coach G explains and recommends. GateCEP does not
          automatically exercise rights, elect shares, move cash,
          or change your investments from this screen.
        </Text>
      </View>

      <Pressable
        style={
          styles.refreshButton
        }
        onPress={
          loadExperience
        }
      >
        <Text
          style={
            styles.buttonText
          }
        >
          Refresh
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.homeButton
        }
        onPress={() =>
          router.replace("/")
        }
      >
        <Text
          style={
            styles.homeText
          }
        >
          Return to Home
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

function SummaryMetric({
  label,
  value
}) {
  return (
    <View
      style={
        styles.summaryMetric
      }
    >
      <Text
        style={
          styles.summaryLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.summaryValue
        }
      >
        {String(value)}
      </Text>
    </View>
  );
}

function ActionCard({
  item
}) {
  const event =
    item?.event ||
    {};

  const amount =
    item
      ?.receivable
      ?.expectedAmount;

  return (
    <View
      style={
        styles.actionCard
      }
    >
      <View
        style={
          styles.actionHeader
        }
      >
        <View
          style={{
            flex: 1
          }}
        >
          <Text
            style={
              styles.symbol
            }
          >
            {event.symbol ||
            "Investment"}
          </Text>

          <Text
            style={
              styles.actionType
            }
          >
            {String(
              event.type ||
              "Corporate action"
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
              )}
          </Text>
        </View>

        <Text
          style={
            styles.priority
          }
        >
          {item.priority}
        </Text>
      </View>

      <Text
        style={
          styles.actionNarrative
        }
      >
        {item.narrative}
      </Text>

      {amount > 0 ? (
        <Text
          style={
            styles.money
          }
        >
          Expected income:{" "}
          {item
            ?.receivable
            ?.currency ||
          "KES"}{" "}
          {Number(
            amount
          ).toLocaleString()}
        </Text>
      ) : null}

      {item
        ?.nextBestAction ? (
        <View
          style={
            styles.nextAction
          }
        >
          <Text
            style={
              styles.nextActionLabel
            }
          >
            NEXT
          </Text>

          <Text
            style={
              styles.nextActionTitle
            }
          >
            {
              item
                .nextBestAction
                .label
            }
          </Text>

          <Text
            style={
              styles.nextActionText
            }
          >
            {
              item
                .nextBestAction
                .reason
            }
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function EmptyState({
  message
}) {
  return (
    <View
      style={
        styles.empty
      }
    >
      <Text
        style={
          styles.emptyText
        }
      >
        {message}
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

    center: {
      flex:
        1,

      backgroundColor:
        "#020617",

      alignItems:
        "center",

      justifyContent:
        "center"
    },

    muted: {
      color:
        "#94a3b8",

      marginTop:
        12
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

    summary: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        10,

      marginTop:
        18
    },

    summaryMetric: {
      width:
        "47%",

      backgroundColor:
        "#0f172a",

      borderRadius:
        14,

      padding:
        13
    },

    summaryLabel: {
      color:
        "#94a3b8",

      fontSize:
        11
    },

    summaryValue: {
      color:
        "white",

      fontSize:
        20,

      fontWeight:
        "900",

      marginTop:
        5
    },

    coachCard: {
      backgroundColor:
        "rgba(124,58,237,.13)",

      borderColor:
        "rgba(167,139,250,.45)",

      borderWidth:
        1,

      borderRadius:
        18,

      padding:
        16,

      marginTop:
        18
    },

    coachLabel: {
      color:
        "#c4b5fd",

      fontWeight:
        "900",

      fontSize:
        11
    },

    coachTitle: {
      color:
        "white",

      fontWeight:
        "900",

      fontSize:
        19,

      marginTop:
        7
    },

    coachText: {
      color:
        "#ddd6fe",

      lineHeight:
        21,

      marginTop:
        8
    },

    question: {
      backgroundColor:
        "#020617",

      borderRadius:
        12,

      padding:
        12,

      marginTop:
        12
    },

    questionLabel: {
      color:
        "#94a3b8",

      fontSize:
        10,

      fontWeight:
        "900"
    },

    questionText: {
      color:
        "#e9d5ff",

      lineHeight:
        20,

      marginTop:
        5
    },

    section: {
      backgroundColor:
        "#0f172a",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        18,

      padding:
        16,

      marginTop:
        18
    },

    sectionTitle: {
      color:
        "#67e8f9",

      fontSize:
        18,

      fontWeight:
        "900"
    },

    sectionDescription: {
      color:
        "#94a3b8",

      lineHeight:
        20,

      marginTop:
        6
    },

    actionCard: {
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

    actionHeader: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      gap:
        10
    },

    symbol: {
      color:
        "white",

      fontWeight:
        "900",

      fontSize:
        17
    },

    actionType: {
      color:
        "#94a3b8",

      marginTop:
        3
    },

    priority: {
      color:
        "#fde68a",

      fontWeight:
        "900",

      fontSize:
        11
    },

    actionNarrative: {
      color:
        "#cbd5e1",

      lineHeight:
        21,

      marginTop:
        10
    },

    money: {
      color:
        "#86efac",

      fontWeight:
        "900",

      marginTop:
        10
    },

    nextAction: {
      backgroundColor:
        "#0f172a",

      borderRadius:
        11,

      padding:
        11,

      marginTop:
        11
    },

    nextActionLabel: {
      color:
        "#22d3ee",

      fontSize:
        9,

      fontWeight:
        "900"
    },

    nextActionTitle: {
      color:
        "white",

      fontWeight:
        "900",

      marginTop:
        4
    },

    nextActionText: {
      color:
        "#94a3b8",

      lineHeight:
        19,

      marginTop:
        5
    },

    empty: {
      backgroundColor:
        "#020617",

      borderRadius:
        12,

      padding:
        13,

      marginTop:
        11
    },

    emptyText: {
      color:
        "#94a3b8"
    },

    notice: {
      backgroundColor:
        "rgba(245,158,11,.10)",

      borderColor:
        "rgba(245,158,11,.35)",

      borderWidth:
        1,

      borderRadius:
        16,

      padding:
        15,

      marginTop:
        18
    },

    noticeTitle: {
      color:
        "#fde68a",

      fontWeight:
        "900"
    },

    noticeText: {
      color:
        "#fef3c7",

      lineHeight:
        20,

      marginTop:
        6
    },

    refreshButton: {
      backgroundColor:
        "#0891b2",

      borderRadius:
        15,

      padding:
        15,

      marginTop:
        16
    },

    buttonText: {
      color:
        "white",

      textAlign:
        "center",

      fontWeight:
        "900"
    },

    homeButton: {
      backgroundColor:
        "#1e293b",

      borderRadius:
        15,

      padding:
        15,

      marginTop:
        10
    },

    homeText: {
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
        14,

      padding:
        13,

      marginTop:
        14
    },

    errorText: {
      color:
        "#fca5a5"
    }
  });
