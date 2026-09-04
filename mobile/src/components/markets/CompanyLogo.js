import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

export default function CompanyLogo({ security = {}, size = 48 }) {
  const [failed, setFailed] = useState(false);
  const symbol = String(security?.symbol || "NSE").trim().toUpperCase();
  const uri = String(security?.logoUrl || security?.logoUri || security?.companyLogoUrl || "").trim();
  const frame = { width: size, height: size, borderRadius: size / 2 };
  return <View style={[styles.frame, frame]} accessibilityLabel={`${symbol} company logo`}>
    {uri && !failed ? <Image source={{ uri }} style={[styles.image, frame]} resizeMode="contain" onError={() => setFailed(true)} /> : <Text style={[styles.fallback, { fontSize: Math.max(12, size * 0.27) }]}>{symbol.slice(0, 3)}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  frame: { alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#fff", borderWidth: 1, borderColor: "#334155" },
  image: { backgroundColor: "#fff" },
  fallback: { color: "#0e7490", fontWeight: "900" }
});
