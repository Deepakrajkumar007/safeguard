import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeatureTile, StatGrid } from "@/components/Dashboard";
import { IconTile, Row, Section } from "@/components/List";
import { T, useSettings } from "@/settings";
import { loadLastScan, timeAgo, type LastScan } from "@/stats-store";
import { colors, radius, spacing } from "@/theme";
import { loadTrusted } from "@/trusted-store";

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { largeText, setLargeText, autoRead, setAutoRead } = useSettings();
  const [lastScan, setLastScan] = useState<LastScan | null>(null);
  const [trustedCount, setTrustedCount] = useState(0);

  // Refresh the dashboard numbers whenever Home comes back into view.
  useFocusEffect(
    useCallback(() => {
      void loadLastScan().then(setLastScan);
      void loadTrusted().then((l) => setTrustedCount(l.length));
    }, []),
  );

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
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
              LinkGuard
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
              { value: String(trustedCount), label: "Trusted senders" },
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

        <Section title="Settings" footer={'LinkGuard never says a message is "safe". It only tells you whether it found warning signs.'}>
          <Row
            left={<IconTile icon="text" color={colors.tile.settings} />}
            title="Larger text"
            right={<Switch value={largeText} onValueChange={setLargeText} trackColor={{ true: colors.blue }} accessibilityLabel="Larger text" />}
          />
          <Row
            left={<IconTile icon="volume-high" color={colors.tile.settings} />}
            title="Read results aloud"
            right={<Switch value={autoRead} onValueChange={setAutoRead} trackColor={{ true: colors.blue }} accessibilityLabel="Read results aloud" />}
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
});
