import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { T, useSettings } from "@/settings";
import { colors, radius } from "@/theme";

type IconName = keyof typeof Ionicons.glyphMap;

const QUICK: { label: string; icon: IconName; color: string; href: Href }[] = [
  { label: "Check text", icon: "chatbubble-ellipses", color: colors.blue, href: "/check" },
  { label: "Screenshot", icon: "image", color: "#7C4DFF", href: "/soon?title=Read a screenshot" },
  { label: "Open a site", icon: "globe", color: "#0B9E6F", href: "/soon?title=Open a site" },
  { label: "Call guard", icon: "call", color: "#E0457B", href: "/soon?title=Call guard" },
  { label: "Gmail", icon: "mail", color: "#E26B00", href: "/soon?title=Scan my Gmail" },
];

const FEATURES: { title: string; body: string; icon: IconName; bg: string; href: Href }[] = [
  {
    title: "Open a website safely",
    body: 'Say "open Chase". We only open real, verified addresses.',
    icon: "globe-outline",
    bg: colors.blueSoft,
    href: "/soon?title=Open a site",
  },
  {
    title: "Call guard",
    body: "Put a call on speaker. We listen for scam tricks.",
    icon: "call-outline",
    bg: colors.lilac,
    href: "/soon?title=Call guard",
  },
  {
    title: "Scan my Gmail",
    body: "Find scam emails hiding in your inbox.",
    icon: "mail-outline",
    bg: colors.mint,
    href: "/soon?title=Scan my Gmail",
  },
  {
    title: "Text message alerts",
    body: "Get a warning when a scam text arrives.",
    icon: "notifications-outline",
    bg: colors.sky,
    href: "/soon?title=Text message alerts",
  },
];

export default function Home() {
  const router = useRouter();
  const { largeText, setLargeText, autoRead, setAutoRead } = useSettings();

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.row}>
            <View style={styles.logo}>
              <Ionicons name="shield-checkmark" size={26} color={colors.white} />
            </View>
            <View>
              <T size={21} weight="800" color={colors.blue}>
                LinkGuard
              </T>
              <T size={14} color={colors.muted}>
                Your scam checker
              </T>
            </View>
          </View>
        </View>

        {/* Settings strip: big, labeled switches for older eyes and ears */}
        <View style={styles.settings}>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: largeText }}
            accessibilityLabel="Larger text"
            onPress={() => setLargeText(!largeText)}
            style={[styles.pill, { backgroundColor: largeText ? colors.ink : colors.white }]}
          >
            <T size={17} weight="800" color={largeText ? colors.white : colors.blue}>
              Aa
            </T>
            <T size={14} weight="700" color={largeText ? colors.white : colors.ink}>
              Larger text: {largeText ? "On" : "Off"}
            </T>
          </Pressable>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: autoRead }}
            accessibilityLabel="Read results aloud"
            onPress={() => setAutoRead(!autoRead)}
            style={[styles.pill, { backgroundColor: autoRead ? colors.ink : colors.white }]}
          >
            <Ionicons name="volume-high" size={18} color={autoRead ? colors.white : colors.blue} />
            <T size={14} weight="700" color={autoRead ? colors.white : colors.ink}>
              Read aloud: {autoRead ? "On" : "Off"}
            </T>
          </Pressable>
        </View>

        {/* Hero card */}
        <View style={styles.hero}>
          <View style={styles.rowBetween}>
            <T size={24} weight="800" color={colors.white} style={{ flex: 1 }}>
              Got a strange text?
            </T>
            <View style={styles.heroBadge}>
              <Ionicons name="lock-closed" size={12} color="#0B7A55" />
              <T size={12} weight="800" color="#0B7A55">
                Checked on your phone
              </T>
            </View>
          </View>
          <View style={styles.chips}>
            {(
              [
                ["clipboard-outline", "Paste"],
                ["image-outline", "Photo"],
                ["create-outline", "Type"],
              ] as [IconName, string][]
            ).map(([icon, label]) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                onPress={() => router.push(label === "Photo" ? "/soon?title=Read a screenshot" : "/check")}
                style={styles.chip}
              >
                <Ionicons name={icon} size={22} color={colors.white} />
                <T size={13} weight="700" color={colors.white}>
                  {label}
                </T>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/check")}
            style={({ pressed }) => [styles.heroButton, pressed && { opacity: 0.85 }]}
          >
            <T size={19} weight="800">
              Check a message
            </T>
          </Pressable>
        </View>

        {/* Quick actions */}
        <View style={[styles.rowBetween, { marginTop: 26 }]}>
          <T size={21} weight="800">
            What do you want to do?
          </T>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          {QUICK.map((q, i) => (
            <Pressable key={q.label} accessibilityRole="button" onPress={() => router.push(q.href)} style={styles.quick}>
              <View style={[styles.quickCircle, i === 0 && styles.quickCircleActive]}>
                <Ionicons name={q.icon} size={26} color={q.color} />
              </View>
              <T size={13} weight="600" style={{ textAlign: "center" }}>
                {q.label}
              </T>
            </Pressable>
          ))}
        </ScrollView>

        {/* Stacked feature cards */}
        <View style={{ marginTop: 10 }}>
          {FEATURES.map((f, i) => (
            <Pressable
              key={f.title}
              accessibilityRole="button"
              onPress={() => router.push(f.href)}
              style={[styles.feature, { backgroundColor: f.bg, marginTop: i === 0 ? 0 : -22, zIndex: i }]}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <T size={21} weight="800">
                  {f.title}
                </T>
                <T size={15} color={colors.muted} style={{ marginTop: 4 }}>
                  {f.body}
                </T>
                <View style={styles.startPill}>
                  <T size={14} weight="800" color={colors.white}>
                    Start
                  </T>
                </View>
              </View>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={34} color={colors.blue} />
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => router.push("/selftest")} style={{ marginTop: 22, alignSelf: "center", padding: 8 }}>
          <T size={13} color={colors.muted}>
            Run checker self-test
          </T>
        </Pressable>
        <T size={13} color={colors.muted} style={{ textAlign: "center", marginTop: 4 }}>
          LinkGuard never says a message is &quot;safe&quot;, only whether it found warning signs.
        </T>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 48 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  logo: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
  settings: { flexDirection: "row", gap: 10, marginTop: 16 },
  pill: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 12, borderRadius: radius.pill },
  hero: { marginTop: 20, backgroundColor: colors.blue, borderRadius: radius.card, padding: 20 },
  heroBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#C9F7DF", paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  chips: { flexDirection: "row", gap: 10, marginTop: 16 },
  chip: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 12, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.18)" },
  heroButton: { marginTop: 16, backgroundColor: colors.white, borderRadius: 18, paddingVertical: 16, alignItems: "center" },
  quickRow: { gap: 14, paddingVertical: 14, paddingRight: 8 },
  quick: { width: 76, alignItems: "center", gap: 6 },
  quickCircle: { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.white },
  quickCircleActive: { borderColor: colors.blue },
  feature: { flexDirection: "row", alignItems: "center", borderRadius: radius.card, padding: 22, paddingBottom: 34 },
  startPill: { marginTop: 12, alignSelf: "flex-start", backgroundColor: colors.blue, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  featureIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.75)", alignItems: "center", justifyContent: "center" },
});
