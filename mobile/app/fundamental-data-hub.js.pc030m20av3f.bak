import React, {
  useMemo
} from "react";

import {
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
  FUNDAMENTAL_NAVIGATION_GROUPS
} from "../src/features/fundamentals/navigation/fundamentalNavigationRegistry";

/*
 * ============================================================
 * PC-026D
 * FUNDAMENTAL DATA WORKFLOW HUB
 * ============================================================
 *
 * This is the permanent entry point for every fundamental-data
 * page. All related pages should return here instead of using
 * router.back().
 * ============================================================
 */

export default function FundamentalDataHubScreen() {
  const routeCount =
    useMemo(
      () =>
        FUNDAMENTAL_NAVIGATION_GROUPS
          .reduce(
            (
              total,
              group
            ) =>
              total +
              group.items.length,
            0
          ),
      []
    );

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
        PC-026D
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Fundamental Data Hub
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        One permanent pathway to imports, extraction, filing
        review, operational monitoring, submission history,
        research, and valuation.
      </Text>

      <View
        style={
          styles.hero
        }
      >
        <View
          style={
            styles.heroCount
          }
        >
          <Text
            style={
              styles.heroCountValue
            }
          >
            {routeCount}
          </Text>

          <Text
            style={
              styles.heroCountLabel
            }
          >
            workspaces
          </Text>
        </View>

        <View
          style={
            styles.heroContent
          }
        >
          <Text
            style={
              styles.heroTitle
            }
          >
            Connected Workflow
          </Text>

          <Text
            style={
              styles.heroText
            }
          >
            Start here, open any workspace, and use its
            Fundamental Hub button to return to this page.
          </Text>
        </View>
      </View>

      <View
        style={
          styles.workflowCard
        }
      >
        <Text
          style={
            styles.workflowTitle
          }
        >
          Recommended Workflow
        </Text>

        <Text
          style={
            styles.workflowText
          }
        >
          Import or extract data
          {"  →  "}
          submit a filing
          {"  →  "}
          review and approve
          {"  →  "}
          promote to repository
          {"  →  "}
          run research and valuation
        </Text>
      </View>

      {FUNDAMENTAL_NAVIGATION_GROUPS.map(
        (group) => (
          <View
            key={
              group.id
            }
            style={
              styles.section
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              {group.title}
            </Text>

            <Text
              style={
                styles.sectionDescription
              }
            >
              {group.description}
            </Text>

            <View
              style={
                styles.grid
              }
            >
              {group.items.map(
                (item) => (
                  <Pressable
                    key={
                      item.id
                    }
                    style={
                      styles.routeCard
                    }
                    onPress={() =>
                      router.push(
                        item.route
                      )
                    }
                  >
                    <View
                      style={
                        styles.routeHeader
                      }
                    >
                      <Text
                        style={
                          styles.routeTitle
                        }
                      >
                        {item.title}
                      </Text>

                      <Text
                        style={
                          styles.phase
                        }
                      >
                        {item.phase}
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.routeDescription
                      }
                    >
                      {item.description}
                    </Text>

                    <Text
                      style={
                        styles.routeLink
                      }
                    >
                      Open Workspace →
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          </View>
        )
      )}

      <View
        style={
          styles.navigationNotice
        }
      >
        <Text
          style={
            styles.navigationNoticeTitle
          }
        >
          Navigation Rule
        </Text>

        <Text
          style={
            styles.navigationNoticeText
          }
        >
          Fundamental-data pages should use
          router.replace("/fundamental-data-hub") for their main
          return button. This prevents Back from returning to an
          empty page or an unrelated browser history location.
        </Text>
      </View>

      <Pressable
        style={
          styles.dashboardButton
        }
        onPress={() =>
          router.replace("/")
        }
      >
        <Text
          style={
            styles.dashboardButtonText
          }
        >
          Return to Main Dashboard
        </Text>
      </Pressable>
    </ScrollView>
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
        16,

      marginTop:
        20
    },

    heroCount: {
      width:
        92,

      height:
        92,

      borderRadius:
        46,

      borderWidth:
        5,

      borderColor:
        "#22d3ee",

      alignItems:
        "center",

      justifyContent:
        "center"
    },

    heroCountValue: {
      color:
        "#86efac",

      fontSize:
        28,

      fontWeight:
        "900"
    },

    heroCountLabel: {
      color:
        "#94a3b8",

      fontSize:
        10,

      fontWeight:
        "900"
    },

    heroContent: {
      flex:
        1
    },

    heroTitle: {
      color:
        "white",

      fontSize:
        21,

      fontWeight:
        "900"
    },

    heroText: {
      color:
        "#cbd5e1",

      lineHeight:
        20,

      marginTop:
        7
    },

    workflowCard: {
      backgroundColor:
        "rgba(124,58,237,.12)",

      borderColor:
        "rgba(167,139,250,.45)",

      borderWidth:
        1,

      borderRadius:
        17,

      padding:
        16,

      marginTop:
        16
    },

    workflowTitle: {
      color:
        "#c4b5fd",

      fontWeight:
        "900"
    },

    workflowText: {
      color:
        "#ddd6fe",

      lineHeight:
        21,

      marginTop:
        7
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
        7
    },

    grid: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        10,

      marginTop:
        13
    },

    routeCard: {
      width:
        "47%",

      minWidth:
        250,

      flexGrow:
        1,

      backgroundColor:
        "#020617",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        15,

      padding:
        15
    },

    routeHeader: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      gap:
        10
    },

    routeTitle: {
      color:
        "white",

      fontWeight:
        "900",

      flex:
        1
    },

    phase: {
      color:
        "#c084fc",

      fontSize:
        10,

      fontWeight:
        "900"
    },

    routeDescription: {
      color:
        "#94a3b8",

      lineHeight:
        19,

      marginTop:
        8
    },

    routeLink: {
      color:
        "#67e8f9",

      fontWeight:
        "900",

      marginTop:
        12
    },

    navigationNotice: {
      backgroundColor:
        "rgba(245,158,11,.10)",

      borderColor:
        "rgba(245,158,11,.35)",

      borderWidth:
        1,

      borderRadius:
        17,

      padding:
        16,

      marginTop:
        20
    },

    navigationNoticeTitle: {
      color:
        "#fde68a",

      fontWeight:
        "900"
    },

    navigationNoticeText: {
      color:
        "#fef3c7",

      lineHeight:
        21,

      marginTop:
        7
    },

    dashboardButton: {
      backgroundColor:
        "#1e293b",

      borderRadius:
        16,

      padding:
        16,

      marginTop:
        15
    },

    dashboardButtonText: {
      color:
        "#67e8f9",

      textAlign:
        "center",

      fontWeight:
        "900"
    }
  });
