import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function calculateResponsivePanelHeight(
  viewportHeight,
  { minHeight = 380, maxHeight = 720, heightRatio = 0.62 } = {}
) {
  const safeViewportHeight = Number.isFinite(viewportHeight) ? viewportHeight : 0;
  return Math.min(maxHeight, Math.max(minHeight, safeViewportHeight * heightRatio));
}

export function MobileScreen({ children, footer = null, testID }) {
  const { width } = useWindowDimensions();
  const compact = width < 720;

  return (
    <SafeAreaView style={styles.safe} testID={testID}>
      <View style={styles.shell}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            !compact && styles.contentWide,
            footer && styles.contentWithFooter
          ]}
        >
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
}

export function MobileHeader({ title, subtitle, onBack, actionLabel, onAction }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        {onBack ? (
          <Pressable style={styles.iconButton} onPress={onBack} accessibilityRole="button">
            <Text style={styles.iconButtonText}>‹</Text>
          </Pressable>
        ) : null}
        <Text style={styles.title}>{title}</Text>
        {onAction ? (
          <Pressable style={styles.headerAction} onPress={onAction}>
            <Text style={styles.headerActionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function JourneyStepper({ steps = [], activeIndex = 0 }) {
  return (
    <View style={styles.stepper} accessibilityRole="progressbar">
      {steps.map((step, index) => {
        const completed = index < activeIndex;
        const active = index === activeIndex;
        return (
          <View key={step} style={styles.stepItem}>
            <View style={[styles.stepDot, completed && styles.stepDone, active && styles.stepActive]}>
              <Text style={styles.stepNumber}>{completed ? "✓" : index + 1}</Text>
            </View>
            <Text numberOfLines={1} style={[styles.stepLabel, active && styles.stepLabelActive]}>
              {step}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function StatusBanner({ tone = "info", title, message }) {
  return (
    <View style={[styles.banner, styles[`banner_${tone}`]]}>
      <Text style={styles.bannerTitle}>{title}</Text>
      {message ? <Text style={styles.bannerMessage}>{message}</Text> : null}
    </View>
  );
}

export function MetricStrip({ items = [] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metrics}>
      {items.map((item) => (
        <View key={item.label} style={styles.metric}>
          <Text style={styles.metricLabel}>{item.label}</Text>
          <Text style={styles.metricValue}>{String(item.value ?? "N/A")}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

export function ContainedPanel({
  title,
  subtitle,
  action = null,
  children,
  emptyMessage = "",
  minHeight = 310,
  maxHeight = 430,
  heightRatio = 0.38,
  testID
}) {
  const { height } = useWindowDimensions();
  const panelHeight = Math.min(maxHeight, Math.max(minHeight, height * heightRatio));

  return (
    <View style={[styles.containedPanel, { height: panelHeight }]} testID={testID}>
      <View style={styles.containedHeader}>
        <View style={styles.containedHeading}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSummary}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      {React.Children.count(children) ? (
        <ScrollView
          style={styles.containedScroll}
          contentContainerStyle={styles.containedContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <Text style={styles.containedEmpty}>{emptyMessage}</Text>
      )}
    </View>
  );
}

export function CollapsibleSection({ title, summary, children, initiallyOpen = false }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={styles.section}>
      <Pressable style={styles.sectionHeader} onPress={() => setOpen((value) => !value)}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {summary ? <Text style={styles.sectionSummary}>{summary}</Text> : null}
        </View>
        <Text style={styles.chevron}>{open ? "⌃" : "⌄"}</Text>
      </Pressable>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

export function StickyActionBar({ primaryLabel, onPrimary, primaryDisabled = false, secondaryLabel, onSecondary }) {
  return (
    <View style={styles.actionBar}>
      {onSecondary ? (
        <Pressable style={styles.secondaryButton} onPress={onSecondary}>
          <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
      <Pressable
        style={[styles.primaryButton, primaryDisabled && styles.buttonDisabled]}
        disabled={primaryDisabled}
        onPress={onPrimary}
      >
        <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
      </Pressable>
    </View>
  );
}

export function IssuePager({ issues = [], renderIssue, itemLabel = "Difference", getItemTitle }) {
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, Math.max(issues.length - 1, 0));
  const issue = useMemo(() => issues[safeIndex] || null, [issues, safeIndex]);

  if (!issue) return null;

  return (
    <View style={styles.section}>
      <View style={styles.pagerHeader}>
        <Text style={styles.sectionTitle}>{itemLabel} {safeIndex + 1} of {issues.length}</Text>
        <Text style={styles.sectionSummary}>{getItemTitle ? getItemTitle(issue) : issue.symbol || "ACCOUNT"}</Text>
      </View>
      <View style={styles.sectionBody}>{renderIssue(issue)}</View>
      <View style={styles.pagerActions}>
        <Pressable
          style={[styles.pagerButton, safeIndex === 0 && styles.buttonDisabled]}
          disabled={safeIndex === 0}
          onPress={() => setIndex((value) => Math.max(value - 1, 0))}
        >
          <Text style={styles.secondaryButtonText}>Previous</Text>
        </Pressable>
        <Pressable
          style={[styles.pagerButton, safeIndex === issues.length - 1 && styles.buttonDisabled]}
          disabled={safeIndex === issues.length - 1}
          onPress={() => setIndex((value) => Math.min(value + 1, issues.length - 1))}
        >
          <Text style={styles.secondaryButtonText}>Next</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function DeveloperIdentifier({ children }) {
  if (!__DEV__) return null;
  return <Text style={styles.developerId}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#020617" },
  shell: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 20, paddingBottom: 32 },
  contentWide: { width: "100%", maxWidth: 960, alignSelf: "center", paddingHorizontal: 24 },
  contentWithFooter: { paddingBottom: 28 },
  footer: { backgroundColor: "#0f172a", borderTopColor: "#1e293b", borderTopWidth: 1, padding: 12 },
  header: { marginBottom: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" },
  iconButtonText: { color: "#67e8f9", fontSize: 30, lineHeight: 30, fontWeight: "900" },
  title: { flex: 1, color: "white", fontSize: 25, fontWeight: "900" },
  subtitle: { color: "#94a3b8", marginTop: 8, lineHeight: 20 },
  headerAction: { backgroundColor: "#1e293b", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  headerActionText: { color: "#67e8f9", fontWeight: "900", fontSize: 12 },
  stepper: { flexDirection: "row", gap: 4, marginVertical: 12 },
  stepItem: { flex: 1, alignItems: "center", minWidth: 0 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" },
  stepDone: { backgroundColor: "#0f766e" },
  stepActive: { backgroundColor: "#9333ea" },
  stepNumber: { color: "white", fontSize: 11, fontWeight: "900" },
  stepLabel: { color: "#64748b", fontSize: 9, marginTop: 5 },
  stepLabelActive: { color: "#e9d5ff", fontWeight: "900" },
  banner: { borderWidth: 1, borderRadius: 18, padding: 14, marginTop: 12 },
  banner_info: { backgroundColor: "rgba(6,182,212,.10)", borderColor: "rgba(6,182,212,.35)" },
  banner_success: { backgroundColor: "rgba(16,185,129,.10)", borderColor: "rgba(16,185,129,.4)" },
  banner_warning: { backgroundColor: "rgba(245,158,11,.10)", borderColor: "rgba(245,158,11,.4)" },
  banner_danger: { backgroundColor: "rgba(239,68,68,.10)", borderColor: "rgba(239,68,68,.4)" },
  bannerTitle: { color: "white", fontWeight: "900", fontSize: 16 },
  bannerMessage: { color: "#cbd5e1", marginTop: 5, lineHeight: 19 },
  metrics: { gap: 10, paddingVertical: 14 },
  metric: { width: 145, backgroundColor: "#0f172a", borderColor: "#1e293b", borderWidth: 1, borderRadius: 16, padding: 14 },
  metricLabel: { color: "#94a3b8", fontSize: 11 },
  metricValue: { color: "white", fontWeight: "900", fontSize: 16, marginTop: 6 },
  containedPanel: { marginTop: 14, backgroundColor: "#0f172a", borderColor: "#1e293b", borderWidth: 1, borderRadius: 18, overflow: "hidden", padding: 15 },
  containedHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingBottom: 10 },
  containedHeading: { flex: 1 },
  containedScroll: { flex: 1 },
  containedContent: { paddingBottom: 8 },
  containedEmpty: { color: "#94a3b8", lineHeight: 20, paddingVertical: 14 },
  section: { marginTop: 14, backgroundColor: "#0f172a", borderColor: "#1e293b", borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", alignItems: "center", padding: 15 },
  sectionHeading: { flex: 1 },
  sectionTitle: { color: "#67e8f9", fontWeight: "900", fontSize: 16 },
  sectionSummary: { color: "#94a3b8", marginTop: 4, fontSize: 12 },
  chevron: { color: "#c084fc", fontSize: 22, fontWeight: "900" },
  sectionBody: { borderTopColor: "#1e293b", borderTopWidth: 1, padding: 15 },
  actionBar: { flexDirection: "row", gap: 10, width: "100%", maxWidth: 960, alignSelf: "center" },
  primaryButton: { flex: 2, backgroundColor: "#9333ea", borderRadius: 15, minHeight: 50, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  primaryButtonText: { color: "white", fontWeight: "900", textAlign: "center" },
  secondaryButton: { flex: 1, backgroundColor: "#1e293b", borderRadius: 15, minHeight: 50, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  secondaryButtonText: { color: "#67e8f9", fontWeight: "900", textAlign: "center" },
  buttonDisabled: { opacity: 0.4 },
  pagerHeader: { padding: 15 },
  pagerActions: { flexDirection: "row", gap: 10, padding: 12, borderTopColor: "#1e293b", borderTopWidth: 1 },
  pagerButton: { flex: 1, backgroundColor: "#1e293b", padding: 13, borderRadius: 13 },
  developerId: { color: "#c084fc", fontWeight: "900", fontSize: 10, marginBottom: 6 }
});
