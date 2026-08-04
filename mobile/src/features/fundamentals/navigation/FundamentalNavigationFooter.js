import React from "react";

import {
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  router
} from "expo-router";

import {
  FUNDAMENTAL_HOME_ROUTE
} from "./fundamentalNavigationRegistry";

/*
 * Reusable navigation footer for all fundamental-data screens.
 */

export default function FundamentalNavigationFooter({
  showDashboard = true
}) {
  return (
    <View
      style={
        styles.container
      }
    >
      <Pressable
        style={
          styles.hubButton
        }
        onPress={() =>
          router.replace(
            FUNDAMENTAL_HOME_ROUTE
          )
        }
      >
        <Text
          style={
            styles.hubButtonText
          }
        >
          Fundamental Data Hub
        </Text>
      </Pressable>

      {showDashboard ? (
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
            Main Dashboard
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      gap:
        10,

      marginTop:
        16
    },

    hubButton: {
      backgroundColor:
        "#0891b2",

      borderRadius:
        16,

      padding:
        16
    },

    hubButtonText: {
      color:
        "white",

      fontWeight:
        "900",

      textAlign:
        "center"
    },

    dashboardButton: {
      backgroundColor:
        "#1e293b",

      borderRadius:
        16,

      padding:
        16
    },

    dashboardButtonText: {
      color:
        "#67e8f9",

      fontWeight:
        "900",

      textAlign:
        "center"
    }
  });
