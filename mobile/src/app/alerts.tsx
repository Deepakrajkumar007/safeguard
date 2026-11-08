import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { formatTrusted, parseTrusted, serializeTrusted, type TrustedEntry } from "@shared/trusted";
import { apiBase } from "@/api";
import { Button } from "@/components/Button";
import { IconTile, Row, Section } from "@/components/List";
import { T, useSettings } from "@/settings";
import { loadTrusted, saveTrusted } from "@/trusted-store";
import { colors, radius, spacing, type } from "@/theme";

/**
 * Text-message alerts. Apple doesn't let apps read Messages, so the person builds a Shortcuts automation
 * once. It sends each new text with a link to LinkGuard's rule-based checker and shows a warning when
 * it's risky. Texts from trusted senders are ignored. Full guide: docs/IPHONE-TEXT-ALERTS.md
 */
const STEPS: string[] = [
  'Open Shortcuts → Automation → + → Message. Set "Message Contains" to http. Choose Run Immediately and turn off Notify When Run. Tap Next → New Blank Automation.',
  "Add Get Contents of URL. Paste the server address. Method: POST. Add a header named x-linkguard-key and paste the app key.",
  "Request Body: JSON. Add three Text fields: text = Shortcut Input; sender = Shortcut Input, then tap it and choose Sender; trusted = paste your trusted list.",
  "Add Get Dictionary Value for show. Add If: Dictionary Value is yes.",
  "Inside If: add Get Dictionary Value for notification, then Show Notification.",
];

const KIND_ICON = { phone: "call", email: "mail", name: "person" } as const;

export default function AlertsScreen() {
  const { scale } = useSettings();
  const [trusted, setTrusted] = useState<TrustedEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const server = `${apiBase() ?? "https://<your-server>"}/api/shortcut`;
  const key = process.env.EXPO_PUBLIC_LINKGUARD_KEY ?? "";

  useEffect(() => {
    void loadTrusted().then(setTrusted);
  }, []);

  const copy = async (label: string, value: string) => {
    await Clipboard.setStringAsync(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 2500);
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
      <T variant="callout" color={colors.muted} style={{ marginHorizontal: spacing.xs }}>
        Apple doesn&apos;t let apps read your messages. You set up a Shortcut once. It sends new texts that contain a link to
        LinkGuard, which warns you if one looks like a scam.
      </T>

      {/* What the warning looks like */}
      <View style={styles.preview} accessible accessibilityLabel="Example warning: LinkGuard, high risk text. Looks like a fake delivery notice. Don't tap the link.">
        <IconTile icon="shield-checkmark" color={colors.blue} />
        <View style={{ flex: 1 }}>
          <T variant="subhead" weight="600">
            LinkGuard: High risk text
          </T>
          <T variant="footnote" color={colors.muted}>
            Looks like a fake delivery notice. Don&apos;t tap the link.
          </T>
        </View>
      </View>

      <Section
        title="Trusted senders"
        footer="LinkGuard ignores texts from these people. They are never checked or saved. Use a phone number, an iCloud email, or a contact name exactly as Messages shows it. After changing this list, copy it into your Shortcut again."
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
        <T variant="footnote" weight="600" color={colors.risk.high.fg} style={{ marginHorizontal: spacing.md, marginTop: -spacing.md }}>
          {draftError}
        </T>
      )}

      <Section title="Set up the Shortcut (about 5 minutes)">
        {STEPS.map((s, i) => (
          <View key={i} style={styles.step}>
            <View style={styles.num}>
              <T variant="subhead" weight="700" color={colors.blue}>
                {i + 1}
              </T>
            </View>
            <T variant="callout" style={{ flex: 1 }}>
              {s}
            </T>
          </View>
        ))}
      </Section>

      <View style={{ gap: spacing.smd }}>
        <Button variant="secondary" icon={copied === "server" ? "checkmark" : "copy-outline"} title={copied === "server" ? "Copied" : "Copy server address"} onPress={() => copy("server", server)} />
        {key.length > 0 && (
          <Button variant="secondary" icon={copied === "key" ? "checkmark" : "key-outline"} title={copied === "key" ? "Copied" : "Copy app key"} onPress={() => copy("key", key)} />
        )}
        <Button
          variant="secondary"
          icon={copied === "trusted" ? "checkmark" : "people-outline"}
          title={copied === "trusted" ? "Copied" : `Copy trusted list (${trusted.length})`}
          disabled={trusted.length === 0}
          onPress={() => copy("trusted", serializeTrusted(trusted))}
        />
        <Button variant="dark" icon="open-outline" title="Open Shortcuts" onPress={() => Linking.openURL("shortcuts://")} />
      </View>

      <T variant="footnote" color={colors.muted} style={{ marginHorizontal: spacing.md }}>
        Privacy: other texts are checked by LinkGuard&apos;s rules only. No AI, and nothing is saved. Texts from trusted senders
        pass through LinkGuard&apos;s server and are dropped right away without being read. Texts without a link (like
        &quot;Grandma, I need bail money&quot;) don&apos;t trigger the Shortcut.
      </T>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.smd,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    padding: spacing.md,
  },
  addRow: { flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, minHeight: 56 },
  addInput: { flex: 1, color: colors.ink, paddingVertical: spacing.smd },
  step: { flexDirection: "row", gap: spacing.smd, paddingHorizontal: spacing.md, paddingVertical: spacing.smd },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.blueSoft, alignItems: "center", justifyContent: "center" },
});
