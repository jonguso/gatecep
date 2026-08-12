import React, {
  useMemo,
  useState
} from "react";

import {
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

/*
 * PC-028M
 * Simple source selector that works on mobile/web without requiring
 * an external picker package.
 */

export default function PortfolioSourceSelector({
  options = [],
  selectedSourceId = null,
  onChange,
  compact = false
}) {
  const [
    open,
    setOpen
  ] = useState(false);

  const selected =
    useMemo(
      () =>
        options.find(
          (item) =>
            item.id ===
            selectedSourceId
        ) ||
        options[0] ||
        null,
      [
        options,
        selectedSourceId
      ]
    );

  if (!selected) {
    return null;
  }

  return (
    <View
      style={
        styles.wrapper
      }
    >
      <Pressable
        style={[
          styles.button,
          compact &&
            styles.buttonCompact
        ]}
        onPress={() =>
          setOpen(
            (value) =>
              !value
          )
        }
      >
        <View>
          <Text
            style={
              styles.label
            }
          >
            Portfolio View
          </Text>

          <Text
            style={
              styles.value
            }
          >
            {selected.label ||
              selected.name}
          </Text>
        </View>

        <Text
          style={
            styles.chevron
          }
        >
          {open ? "▲" : "▼"}
        </Text>
      </Pressable>

      {open ? (
        <View
          style={
            styles.menu
          }
        >
          {options.map(
            (item) => {
              const active =
                item.id ===
                selected.id;

              return (
                <Pressable
                  key={
                    item.id
                  }
                  style={[
                    styles.option,
                    active &&
                      styles.optionActive
                  ]}
                  onPress={() => {
                    setOpen(false);

                    if (
                      typeof onChange ===
                      "function"
                    ) {
                      onChange(
                        item.id
                      );
                    }
                  }}
                >
                  <View
                    style={
                      styles.optionTextWrap
                    }
                  >
                    <Text
                      style={
                        styles.optionTitle
                      }
                    >
                      {item.label ||
                        item.name}
                    </Text>

                    {item.isPractice ? (
                      <Text
                        style={
                          styles.practiceLabel
                        }
                      >
                        SIMULATION ONLY
                      </Text>
                    ) : null}
                  </View>

                  {active ? (
                    <Text
                      style={
                        styles.activeMark
                      }
                    >
                      ✓
                    </Text>
                  ) : null}
                </Pressable>
              );
            }
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles =
  StyleSheet.create({
    wrapper: {
      position: "relative",
      zIndex: 50
    },

    button: {
      minWidth: 200,
      borderWidth: 1,
      borderColor: "#334155",
      backgroundColor: "#0f172a",
      borderRadius: 13,
      paddingHorizontal: 13,
      paddingVertical: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12
    },

    buttonCompact: {
      minWidth: 165,
      paddingVertical: 8
    },

    label: {
      color: "#64748b",
      fontSize: 9,
      fontWeight: "800"
    },

    value: {
      color: "#f8fafc",
      marginTop: 2,
      fontWeight: "900"
    },

    chevron: {
      color: "#67e8f9",
      fontWeight: "900"
    },

    menu: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      marginTop: 6,
      backgroundColor: "#020617",
      borderWidth: 1,
      borderColor: "#334155",
      borderRadius: 13,
      overflow: "hidden"
    },

    option: {
      paddingHorizontal: 13,
      paddingVertical: 11,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "#1e293b"
    },

    optionActive: {
      backgroundColor: "#0f172a"
    },

    optionTextWrap: {
      flex: 1
    },

    optionTitle: {
      color: "#f8fafc",
      fontWeight: "800"
    },

    practiceLabel: {
      color: "#fde68a",
      fontSize: 8,
      fontWeight: "900",
      marginTop: 3
    },

    activeMark: {
      color: "#22d3ee",
      fontWeight: "900"
    }
  });
