import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, Switch, TextInput, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { FeatureTile, StatGrid } from "@/components/Dashboard";
import { IconTile, Row, Section } from "@/components/List";
import { checkText, type TextVerdict } from "@/check-text";
import { T, useSettings } from "@/settings";
import { loadLastScan, timeAgo, type LastScan } from "@/stats-store";
import { colors, radius, shadows, spacing, type } from "@/theme";
import { useKeyboardScroll } from "@/use-keyboard-scroll";
import { loadWarnings } from "@/warnings";

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { largeText, setLargeText, setDarkMode, scale } = useSettings();
  const darkMode = useColorScheme() === "dark";
  const { scrollRef, onScroll } = useKeyboardScroll();
  // "Check a message": paste any text or email and see SafeGuard's verdict right here.
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<TextVerdict | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const check = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setVerdict(null);
    setCheckError(null);
    try {
      setVerdict(await checkText(text));
    } catch (e) {
      setCheckError(e instanceof Error ? e.message : "Couldn't check right now. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  };
  const [lastScan, setLastScan] = useState<LastScan | null>(null);
  const [riskyTexts, setRiskyTexts] = useState(0);

  // Refresh the dashboard numbers whenever Home comes back into view, or the app comes back to the front
  // (the Shortcuts action can add a warning while SafeGuard is in the background).
  const refresh = useCallback(() => {
    void loadLastScan().then(setLastScan);
    setRiskyTexts(loadWarnings().length); // every card in Recent warnings, including tests
  }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={onScroll}
      scrollEventThrottle={16}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
    >
      <StatusBar style="light" />
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.lg }]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <T variant="subhead" color={colors.onGradientMuted}>
              SafeGuard
            </T>
            <T variant="largeTitle" color={colors.white} accessibilityRole="header">
              Your protection
            </T>
          </View>
          <View style={styles.avatar}>
            <Ionicons name="shield-checkmark" size={26} color={colors.white} />
          </View>
        </View>
        <T variant="callout" color={colors.onGradientMuted}>
          Scam emails, fake websites, and scam texts.
        </T>
      </LinearGradient>

      <View style={styles.body}>
        <View style={{ marginTop: -spacing.xxl }}>
          <StatGrid
            stats={[
              { value: lastScan ? String(lastScan.scanned) : "–", label: "Emails checked" },
              { value: lastScan ? String(lastScan.flagged) : "–", label: "Risky emails", tone: lastScan && lastScan.flagged > 0 ? "high" : undefined },
              { value: String(riskyTexts), label: "Risky texts", tone: riskyTexts > 0 ? "high" : undefined },
              { value: lastScan ? timeAgo(lastScan.at) : "Not yet", label: "Last Gmail scan" },
            ]}
          />
        </View>

        <View style={{ gap: spacing.smd }}>
          <T variant="headline" style={{ marginHorizontal: spacing.xs }} accessibilityRole="header">
            Protect me
          </T>
          <View style={styles.tiles}>
            <FeatureTile icon="mail" label="Scan my Gmail" color={colors.tile.gmail} highlight onPress={() => router.push("/gmail")} />
            <FeatureTile icon="globe" label="Open a website" color={colors.tile.web} onPress={() => router.push("/open")} />
            <FeatureTile icon="chatbubbles" label="Text alerts" color={colors.tile.texts} onPress={() => router.push("/alerts")} />
          </View>
        </View>

        <View style={{ gap: spacing.smd }}>
          <T variant="headline" style={{ marginHorizontal: spacing.xs }} accessibilityRole="header">
            Check a message
          </T>
          <View style={styles.checkCard}>
            <T variant="subhead" color={colors.muted}>
              Not sure about a text or email? Paste it here and SafeGuard checks it for scam warning signs.
            </T>
            <TextInput
              value={text}
              onChangeText={(v) => {
                setText(v);
                setVerdict(null);
                setCheckError(null);
              }}
              multiline
              maxLength={5000}
              placeholder="Paste a text or email here"
              placeholderTextColor={colors.placeholder}
              accessibilityLabel="Message to check"
              style={[styles.checkInput, { fontSize: Math.round(type.callout.fontSize * scale), minHeight: 96 * scale }]}
            />
            <Button title={busy ? "Checking…" : "Check this message"} icon="shield-checkmark" loading={busy} disabled={!text.trim()} onPress={check} />
            {!text && (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setText("USPS: Your package could not be delivered. Update now: https://usps.com-redelivery.info/track")}
                style={{ alignSelf: "center" }}
              >
                <T variant="subhead" weight="600" color={colors.blue}>
                  Try an example scam text
                </T>
              </Pressable>
            )}
            {verdict && (
              <View style={[styles.result, { backgroundColor: colors.risk[verdict.level].bg }]} accessibilityLiveRegion="polite">
                <Ionicons
                  name={verdict.level === "none" ? "checkmark-circle" : "warning"}
                  size={22}
                  color={colors.risk[verdict.level].fg}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="headline" color={colors.risk[verdict.level].fg}>
                    {verdict.level === "none" ? "No red flags found" : colors.risk[verdict.level].label}
                  </T>
                  <T variant="subhead" color={colors.risk[verdict.level].fg}>
                    {verdict.level === "none"
                      ? "SafeGuard didn't find warning signs. That isn't a guarantee, so stay careful with links."
                      : verdict.body}
                  </T>
                </View>
              </View>
            )}
            {checkError && (
              <T variant="footnote" weight="600" color={colors.risk.high.fg}>
                {checkError}
              </T>
            )}
          </View>
        </View>

        <Section title="Settings" footer={'SafeGuard never says a message is "safe". It only tells you whether it found warning signs.'}>
          <Row
            left={<IconTile icon="text" color={colors.tile.settings} />}
            title="Larger text"
            right={<Switch value={largeText} onValueChange={setLargeText} trackColor={{ true: colors.blue }} accessibilityLabel="Larger text" />}
          />
          <Row
            left={<IconTile icon="moon" color={colors.tile.settings} />}
            title="Dark mode"
            right={<Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: colors.blue }} accessibilityLabel="Dark mode" />}
          />
        </Section>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.mdl,
    paddingBottom: spacing.xxl + spacing.lg,
    gap: spacing.sm,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingHorizontal: spacing.md, gap: spacing.lg },
  tiles: { flexDirection: "row", gap: spacing.smd },
  checkCard: { backgroundColor: colors.card, borderRadius: radius.xl, borderCurve: "continuous", padding: spacing.md, gap: spacing.smd, boxShadow: shadows.card },
  checkInput: { backgroundColor: colors.bg, borderRadius: radius.md, borderCurve: "continuous", padding: spacing.smd, color: colors.ink, textAlignVertical: "top" },
  result: { flexDirection: "row", gap: spacing.smd, padding: spacing.md, borderRadius: radius.lg, borderCurve: "continuous", alignItems: "flex-start" },
});
