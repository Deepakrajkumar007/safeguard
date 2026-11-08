import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiBase } from "@/api";
import { ScreenHeader } from "@/components/ScreenHeader";
import { T } from "@/settings";
import { colors, radius } from "@/theme";

/**
 * Text-message alerts. Apple doesn't let apps read Messages, so the person builds a Shortcuts automation
 * that sends each new text to LinkGuard's rule-based checker and shows a notification when it's risky.
 * Full guide: docs/IPHONE-TEXT-ALERTS.md
 */
const STEPS: string[] = [
  "Open Shortcuts → Automation → + → Message.",
  'Message Contains: "http". Choose Run Immediately, turn off Notify When Run.',
  "New Blank Automation → add Get Contents of URL.",
  "Paste the server address. Method POST. Header x-linkguard-key = paste the app key.",
  "Request Body JSON: add Text field named text = Shortcut Input.",
  "Add Get Dictionary Value: show. Then If Dictionary Value is yes.",
  "Inside If: Get Dictionary Value: notification, then Show Notification.",
];

export default function AlertsScreen() {
  const [copied, setCopied] = useState<string | null>(null);
  const server = `${apiBase() ?? "https://<your-server>"}/api/shortcut`;
  const key = process.env.EXPO_PUBLIC_LINKGUARD_KEY ?? "";

  const copy = async (label: string, value: string) => {
    await Clipboard.setStringAsync(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 2500);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.page}>
        <ScreenHeader title="Text alerts" />

        <View style={styles.hero}>
          <T size={22} weight="800" color={colors.white}>
            Get a warning when a scam text arrives
          </T>
          <T size={15} color="rgba(255,255,255,0.9)">
            Apple doesn&apos;t let apps read your messages. Instead, you set up a Shortcut once. It sends each new text with a
            link to LinkGuard and shows a warning if it looks like a scam.
          </T>
          <View style={styles.example}>
            <Ionicons name="notifications" size={22} color={colors.risk.high.fg} />
            <View style={{ flex: 1 }}>
              <T size={14} weight="800">
                LinkGuard: High risk text
              </T>
              <T size={13} color={colors.muted}>
                Looks like a fake delivery notice. Don&apos;t tap the link.
              </T>
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <Pressable accessibilityRole="button" onPress={() => copy("server", server)} style={styles.copyBtn}>
            <Ionicons name={copied === "server" ? "checkmark" : "copy-outline"} size={20} color={colors.blue} />
            <T size={16} weight="800" color={colors.blue}>
              {copied === "server" ? "Copied" : "Copy server address"}
            </T>
          </Pressable>
          {key.length > 0 && (
            <Pressable accessibilityRole="button" onPress={() => copy("key", key)} style={styles.copyBtn}>
              <Ionicons name={copied === "key" ? "checkmark" : "key-outline"} size={20} color={colors.blue} />
              <T size={16} weight="800" color={colors.blue}>
                {copied === "key" ? "Copied" : "Copy app key"}
              </T>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <T size={20} weight="800" accessibilityRole="header">
            Set it up (about 5 minutes)
          </T>
          {STEPS.map((s, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 12 }}>
              <View style={styles.num}>
                <T size={14} weight="800" color={colors.blue}>
                  {i + 1}
                </T>
              </View>
              <T size={16} style={{ flex: 1, paddingTop: 3 }}>
                {s}
              </T>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => Linking.openURL("shortcuts://")}
            style={({ pressed }) => [styles.openBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="open-outline" size={20} color={colors.white} />
            <T size={18} weight="800" color={colors.white}>
              Open Shortcuts
            </T>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: colors.mint }]}>
          <T size={17} weight="800">
            Privacy
          </T>
          <T size={15}>
            Texts sent by the Shortcut are checked by LinkGuard&apos;s rules only. No AI, and nothing is saved. You can delete the
            automation any time in Shortcuts.
          </T>
          <T size={13} color={colors.muted}>
            Texts without a link (like &quot;Grandma, I need bail money&quot;) won&apos;t trigger it. Paste those into Check a
            message.
          </T>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 48, gap: 16 },
  hero: { backgroundColor: colors.blue, borderRadius: radius.card, padding: 20, gap: 12, marginTop: 8 },
  example: { backgroundColor: colors.white, borderRadius: 18, padding: 14, flexDirection: "row", gap: 10, alignItems: "center" },
  row: { gap: 10 },
  copyBtn: {
    backgroundColor: colors.card,
    borderRadius: radius.row,
    paddingVertical: 14,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.blueSoft,
  },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 18, gap: 12 },
  num: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.blueSoft, alignItems: "center", justifyContent: "center" },
  openBtn: {
    marginTop: 4,
    backgroundColor: colors.ink,
    borderRadius: radius.row,
    paddingVertical: 16,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
