import { Ionicons } from "@expo/vector-icons";
import * as AppIntents from "expo-app-intents";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { formatTrusted, parseTrusted, type TrustedEntry } from "@shared/trusted";
import { Button, Notice } from "@/components/Button";
import { IconTile, Row, Section } from "@/components/List";
import { T, useSettings } from "@/settings";
import { colors, radius, shadows, spacing, type } from "@/theme";
import { loadTrusted, saveTrusted } from "@/trusted-store";

/**
 * Text-message alerts. Apple doesn't let apps read Messages, so the person adds ONE Shortcuts automation
 * with LinkGuard's "Check Message with LinkGuard" action. That action (app-intents/CheckMessageIntent.swift)
 * drops trusted senders on the phone, checks other texts with LinkGuard's rules, and shows a warning.
 */
const STEPS: { title: string; detail: string }[] = [
  { title: "Open Shortcuts and start an automation", detail: "Tap Automation at the bottom, then +, then Message. Choose Run Immediately, then New Blank Automation." },
  { title: "Add LinkGuard's action", detail: 'Search for "LinkGuard" and tap Check Message with LinkGuard.' },
  { title: "Fill in the two blue words", detail: "Tap Message and choose Shortcut Input. Tap Sender and choose Shortcut Input, then Sender." },
  { title: "Tap Done", detail: "That's it. LinkGuard now warns you about risky texts, and ignores your trusted senders." },
];

const KIND_ICON = { phone: "call", email: "mail", name: "person" } as const;

export default function AlertsScreen() {
  const { scale } = useSettings();
  const [trusted, setTrusted] = useState<TrustedEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [notifOn, setNotifOn] = useState<boolean | null>(null);
  const [tested, setTested] = useState(false);
  const native = AppIntents.isAvailable();

  useFocusEffect(
    useCallback(() => {
      void loadTrusted().then(setTrusted);
      void Notifications.getPermissionsAsync().then((p) => setNotifOn(p.granted));
    }, []),
  );

  const enableNotifications = async () => {
    const p = await Notifications.requestPermissionsAsync();
    setNotifOn(p.granted);
    if (!p.granted) void Linking.openSettings();
  };

  const sendTest = async () => {
    await Notifications.scheduleNotificationAsync({
      content: { title: "LinkGuard: High risk text", body: "Looks like a fake delivery notice. Don't tap the link. (This is a test.)" },
      trigger: null,
    });
    setTested(true);
  };

  const add = async () => {
    const entry = parseTrusted(draft);
    if (!entry) {
      setDraftError("Enter a phone number, an email like mom@icloud.com, or a contact name.");
      return;
    }
    if (trusted.some((t) => t.kind === entry.kind && t.value === entry.value)) {
      setDraft("");
      return;
    }
    const next = [...trusted, entry].slice(0, 100);
    setTrusted(next);
    setDraft("");
    setDraftError(null);
    await saveTrusted(next);
  };

  const remove = async (entry: TrustedEntry) => {
    const next = trusted.filter((t) => !(t.kind === entry.kind && t.value === entry.value));
    setTrusted(next);
    await saveTrusted(next);
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg }}
    >
      <StatusBar style="dark" />

      {/* Status card */}
      <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.status}>
        <T variant="title" color={colors.white}>
          Get warned about scam texts
        </T>
        <T variant="callout" color={colors.onGradientMuted}>
          Apple doesn&apos;t let apps read your messages, so you add one Shortcut. Texts from your trusted senders never leave this
          iPhone.
        </T>
        <View style={styles.statusRow}>
          <View style={styles.pill}>
            <Ionicons name={notifOn ? "notifications" : "notifications-off"} size={16} color={colors.white} />
            <T variant="footnote" weight="600" color={colors.white}>
              Notifications {notifOn ? "on" : "off"}
            </T>
          </View>
          <View style={styles.pill}>
            <Ionicons name="people" size={16} color={colors.white} />
            <T variant="footnote" weight="600" color={colors.white}>
              {trusted.length} trusted
            </T>
          </View>
        </View>
      </LinearGradient>

      {notifOn === false && (
        <View style={{ gap: spacing.smd }}>
          <Notice tone="caution" icon="notifications-off">
            Notifications are off, so LinkGuard can&apos;t warn you. Turn them on first.
          </Notice>
          <Button title="Turn on notifications" icon="notifications" onPress={enableNotifications} />
        </View>
      )}

      {!native && (
        <Notice tone="caution" icon="information-circle">
          The LinkGuard Shortcuts action needs the installed LinkGuard app (it isn&apos;t available inside Expo Go).
        </Notice>
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

      {/* Trusted senders */}
      <Section
        title="Trusted senders"
        footer="LinkGuard ignores texts from these people. The check happens on this iPhone, so their texts are never sent anywhere. Use a phone number, an iCloud email, or a contact name exactly as Messages shows it."
      >
        {trusted.map((t) => (
          <Row
            key={`${t.kind}:${t.value}`}
            left={<IconTile icon={KIND_ICON[t.kind]} color={colors.tile.texts} />}
            title={formatTrusted(t)}
            subtitle={t.kind === "phone" ? "Phone number" : t.kind === "email" ? "Email / iCloud" : "Contact name"}
            right={
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${formatTrusted(t)}`} hitSlop={10} onPress={() => remove(t)}>
                <Ionicons name="remove-circle" size={24} color={colors.risk.high.fg} />
              </Pressable>
            }
          />
        ))}
        <View style={styles.addRow}>
          <TextInput
            value={draft}
            onChangeText={(v) => {
              setDraft(v);
              setDraftError(null);
            }}
            onSubmitEditing={add}
            placeholder="(716) 555-0123 or mom@icloud.com"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            accessibilityLabel="Trusted sender to add"
            style={[styles.addInput, { fontSize: Math.round(type.body.fontSize * scale) }]}
          />
          <Pressable accessibilityRole="button" onPress={add} hitSlop={8}>
            <T variant="headline" color={colors.blue}>
              Add
            </T>
          </Pressable>
        </View>
      </Section>
      {draftError && (
        <T variant="footnote" weight="600" color={colors.risk.high.fg} style={{ marginHorizontal: spacing.xs, marginTop: -spacing.md }}>
          {draftError}
        </T>
      )}

      <T variant="footnote" color={colors.muted} style={{ marginHorizontal: spacing.xs }}>
        Privacy: other texts are checked by LinkGuard&apos;s rules only (no AI) and nothing is saved. Tip: in step 1 you can set
        &quot;Message Contains&quot; to http so only texts with links are checked.
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
  num: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.violetSoft, alignItems: "center", justifyContent: "center" },
  addRow: { flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, minHeight: 56 },
  addInput: { flex: 1, color: colors.ink, paddingVertical: spacing.smd },
});
