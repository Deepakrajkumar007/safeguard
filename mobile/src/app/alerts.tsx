import { Ionicons } from "@expo/vector-icons";
import * as AppIntents from "expo-app-intents";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Notice } from "@/components/Button";
import { T } from "@/settings";
import { timeAgo } from "@/stats-store";
import { colors, radius, shadows, spacing } from "@/theme";
import { addTestWarning, clearWarnings, loadWarnings, type TextWarning } from "@/warnings";

/**
 * Text-message alerts. Apple doesn't let apps read Messages, so the person adds ONE Shortcuts automation
 * with SafeGuard's "Check Message with SafeGuard" action. That action (app-intents/CheckMessageIntent.swift)
 * checks the text with SafeGuard's rules, shows a warning, and adds risky texts to Recent warnings.
 */
const STEPS: { title: string; detail: string }[] = [
  { title: "Start a Message automation", detail: "Open Shortcuts. Tap Automation at the bottom, then +, then Message." },
  { title: "Type http in Message Contains", detail: "Tap Message Contains, type http, tap Done. Choose Run Immediately, tap Next, then New Blank Automation." },
  { title: "Add SafeGuard's action", detail: 'Search for "SafeGuard" and tap Check Message with SafeGuard.' },
  { title: "Fill in the two blue words", detail: "Tap Message and choose Shortcut Input. Tap Sender, choose Shortcut Input, then tap it again and choose Sender." },
  { title: "Tap Done", detail: "That's it. Texts with links get checked, and risky ones show up in Recent warnings. Texts you send yourself may not trigger it." },
];

/** "+17165550123" -> "(716) 555-0123"; contact names and emails stay as Messages shows them. */
function senderLabel(sender: string): string {
  const s = sender.trim();
  if (!s) return "Unknown (Shortcut run by hand)";
  if (/^[+(\d][\d\s().-]*$/.test(s)) {
    const digits = s.replace(/\D/g, "");
    const d = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
    if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return s;
}

export default function AlertsScreen() {
  const [notifOn, setNotifOn] = useState<boolean | null>(null);
  const [tested, setTested] = useState(false);
  const [warnings, setWarnings] = useState<TextWarning[]>([]);
  const [now, setNow] = useState(0);
  const native = AppIntents.isAvailable();

  const refreshWarnings = useCallback(() => {
    setWarnings(loadWarnings());
    setNow(Date.now());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void Notifications.getPermissionsAsync().then((p) => setNotifOn(p.granted));
      refreshWarnings();
    }, [refreshWarnings]),
  );

  // The Shortcuts action can add a warning while the app sits in the background: refresh on return.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refreshWarnings();
    });
    return () => sub.remove();
  }, [refreshWarnings]);

  const enableNotifications = async () => {
    const p = await Notifications.requestPermissionsAsync();
    setNotifOn(p.granted);
    if (!p.granted) void Linking.openSettings();
  };

  const sendTest = async () => {
    const title = "SafeGuard: High risk text";
    const body = "Looks like a fake delivery notice. Don't tap the link.";
    // Also add a sample card to Recent warnings (marked as a test), so the whole flow can be seen.
    addTestWarning("high", title, body, "USPS: Your package could not be delivered. Update now: https://usps.com-redelivery.info/track", "SafeGuard test");
    refreshWarnings();
    await Notifications.scheduleNotificationAsync({
      content: { title, body: `${body} (This is a test.)`, data: { url: "/alerts" } },
      trigger: null,
    });
    setTested(true);
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg }}
    >
      <StatusBar style="auto" />

      {/* Status card */}
      <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.status}>
        <T variant="title" color={colors.white}>
          Get warned about scam texts
        </T>
        <T variant="callout" color={colors.onGradientMuted}>
          Apple doesn&apos;t let apps read your messages, so you add one Shortcut. SafeGuard then checks texts with links and warns
          you about risky ones.
        </T>
        <View style={styles.statusRow}>
          <View style={styles.pill}>
            <Ionicons name={notifOn ? "notifications" : "notifications-off"} size={16} color={colors.white} />
            <T variant="footnote" weight="600" color={colors.white}>
              Notifications {notifOn ? "on" : "off"}
            </T>
          </View>
          <View style={styles.pill}>
            <Ionicons name="warning" size={16} color={colors.white} />
            <T variant="footnote" weight="600" color={colors.white}>
              {warnings.length} {warnings.length === 1 ? "warning" : "warnings"}
            </T>
          </View>
        </View>
      </LinearGradient>

      {notifOn === false && (
        <View style={{ gap: spacing.smd }}>
          <Notice tone="caution" icon="notifications-off">
            Notifications are off, so SafeGuard can&apos;t warn you. Turn them on first.
          </Notice>
          <Button title="Turn on notifications" icon="notifications" onPress={enableNotifications} />
        </View>
      )}

      {!native && (
        <Notice tone="caution" icon="information-circle">
          The SafeGuard Shortcuts action needs the installed SafeGuard app (it isn&apos;t available inside Expo Go).
        </Notice>
      )}

      {/* Recent warnings: texts the Shortcuts action flagged, who sent them, and why (kept on this iPhone only). */}
      {native && (
        <View style={{ gap: spacing.smd }}>
          <View style={styles.sectionHead}>
            <T variant="headline" accessibilityRole="header">
              Recent warnings
            </T>
            {warnings.length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear recent warnings"
                hitSlop={10}
                onPress={() => {
                  clearWarnings();
                  refreshWarnings();
                }}
              >
                <T variant="subhead" weight="600" color={colors.blue}>
                  Clear
                </T>
              </Pressable>
            )}
          </View>
          {warnings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="shield-checkmark-outline" size={28} color={colors.violet} />
              <T variant="subhead" color={colors.muted} style={{ textAlign: "center" }}>
                No warnings yet. When the Shortcut flags a text, it shows up here with who sent it, even if you missed the
                notification.
              </T>
            </View>
          ) : (
            warnings.map((w) => (
              <View key={`${w.at}-${w.title}`} style={[styles.warnCard, { borderLeftColor: colors.risk[w.level].fg }]}>
                <View style={[styles.warnIcon, { backgroundColor: colors.risk[w.level].bg }]}>
                  <Ionicons name="warning" size={20} color={colors.risk[w.level].fg} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="headline" color={colors.risk[w.level].fg}>
                    {colors.risk[w.level].label}
                    {w.test ? " (test)" : ""}
                  </T>
                  <T variant="subhead" weight="600">
                    From: {senderLabel(w.sender)}
                  </T>
                  {w.message !== "" && (
                    <View style={styles.quote}>
                      <T variant="subhead" numberOfLines={6} selectable>
                        {w.message}
                      </T>
                    </View>
                  )}
                  <T variant="subhead" color={colors.muted}>
                    {w.body || w.title}
                  </T>
                  <T variant="footnote" color={colors.muted}>
                    {now ? timeAgo(w.at, now) : ""}
                    {w.notified ? "" : " · shown by Shortcuts"}
                  </T>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Setup steps */}
      <View style={{ gap: spacing.smd }}>
        <T variant="headline" style={{ marginHorizontal: spacing.xs }} accessibilityRole="header">
          Set it up once (2 minutes)
        </T>
        {STEPS.map((s, i) => (
          <View key={i} style={styles.stepCard}>
            <View style={styles.num}>
              <T variant="headline" color={colors.violet}>
                {i + 1}
              </T>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="headline">{s.title}</T>
              <T variant="subhead" color={colors.muted}>
                {s.detail}
              </T>
            </View>
          </View>
        ))}
        <Button title="Open Shortcuts" icon="open-outline" onPress={() => Linking.openURL("shortcuts://")} />
        <Button
          variant="secondary"
          title={tested ? "Test warning sent" : "Send a test warning"}
          icon={tested ? "checkmark" : "notifications-outline"}
          disabled={notifOn === false}
          onPress={sendTest}
        />
      </View>

      <T variant="footnote" color={colors.muted} style={{ marginHorizontal: spacing.xs }}>
        Privacy: other texts are checked by SafeGuard&apos;s rules only (no AI), and the server saves nothing. Only texts SafeGuard
        warns you about are kept, on this iPhone, in Recent warnings (last 20; tap Clear to delete them). Tip: to check texts
        without links too, type the letter e instead of http in step 2.
      </T>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  status: { borderRadius: radius.xxl, borderCurve: "continuous", padding: spacing.mdl, gap: spacing.smd, boxShadow: shadows.raised },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: radius.full,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.xs,
  },
  stepCard: {
    flexDirection: "row",
    gap: spacing.smd,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderCurve: "continuous",
    padding: spacing.md,
    boxShadow: shadows.card,
  },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: spacing.xs },
  emptyCard: { backgroundColor: colors.card, borderRadius: radius.xl, borderCurve: "continuous", padding: spacing.lg, gap: spacing.sm, alignItems: "center", boxShadow: shadows.card },
  warnCard: {
    flexDirection: "row",
    gap: spacing.smd,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderCurve: "continuous",
    borderLeftWidth: 4,
    padding: spacing.md,
    alignItems: "flex-start",
    boxShadow: shadows.card,
  },
  quote: { backgroundColor: colors.bg, borderRadius: radius.md, borderCurve: "continuous", padding: spacing.smd, marginVertical: spacing.xs },
  warnIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  num: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.violetSoft, alignItems: "center", justifyContent: "center" },
});
