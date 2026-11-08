import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputInstance } from "react-native";
import type { Brand } from "@shared/brands";
import { matchSpoken, POPULAR } from "@shared/launcher";
import { Button, Notice } from "@/components/Button";
import { InitialBadge } from "@/components/List";
import { T, useSettings } from "@/settings";
import { colors, radius, shadows, spacing, type } from "@/theme";

/**
 * Voice launcher. The person says or types a NAME ("Chase"). We show the real address from the
 * verified list and open exactly that. Speech is never turned into a web address.
 */
export default function OpenSite() {
  const { scale } = useSettings();
  // Optional prefill for demos: /open?q=chase
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [said, setSaid] = useState(typeof q === "string" ? q : "");
  const [picked, setPicked] = useState<Brand | null>(null);
  const inputRef = useRef<TextInputInstance>(null);

  const match = useMemo(() => matchSpoken(said), [said]);
  const chosen = picked ?? match.brand;
  const options = (said.trim() ? match.suggestions : POPULAR).filter((b) => b.id !== chosen?.id);

  const choose = (b: Brand) => {
    setPicked(b);
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg }}
    >
      <StatusBar style="auto" />
      {/* Big mic button: opens the keyboard so you can tap its microphone and say a name. */}
      <View style={{ alignItems: "center", gap: spacing.smd, paddingTop: spacing.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Say a website name"
          onPress={() => inputRef.current?.focus()}
          style={({ pressed }) => [styles.micOuter, { opacity: pressed ? 0.85 : 1 }]}
        >
          <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.micInner}>
            <Ionicons name="mic" size={44} color={colors.white} />
          </LinearGradient>
        </Pressable>
        <T variant="callout" color={colors.muted} style={{ textAlign: "center", marginHorizontal: spacing.lg }}>
          Tap the microphone, then the mic on your keyboard, and say a name like &quot;Chase&quot;.
        </T>
      </View>

      <View style={{ gap: spacing.sm }}>
        <View style={styles.field}>
          <Ionicons name="mic" size={22} color={colors.blue} />
          <TextInput
            ref={inputRef}
            value={said}
            onChangeText={(v) => {
              setSaid(v);
              setPicked(null);
            }}
            placeholder="Say or type a name"
            placeholderTextColor={colors.placeholder}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="done"
            accessibilityLabel="Website name"
            style={[styles.input, { fontSize: Math.round(type.body.fontSize * 1.1 * scale) }]}
          />
          {said.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear"
              hitSlop={10}
              onPress={() => {
                setSaid("");
                setPicked(null);
                inputRef.current?.focus();
              }}
            >
              <Ionicons name="close-circle" size={22} color={colors.muted} />
            </Pressable>
          )}
        </View>
        <View style={styles.lock}>
          <Ionicons name="lock-closed" size={13} color={colors.risk.none.fg} />
          <T variant="footnote" weight="600" color={colors.risk.none.fg}>
            We only open addresses from our verified list
          </T>
        </View>
      </View>

      {/* An address we don't know: never open it. */}
      {match.unknownAddress && !picked && (
        <Notice tone="caution" icon="warning">
          That address isn&apos;t on our verified list, so SafeGuard won&apos;t open it. Say the company&apos;s name instead.
        </Notice>
      )}

      {/* The verified answer. */}
      {chosen && (
        <View style={styles.answer} accessible accessibilityLabel={`${chosen.name}. Verified address ${chosen.launchUrl}`}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
            <InitialBadge name={chosen.name} size={44} />
            <View style={{ flex: 1 }}>
              <T variant="title">{chosen.name}</T>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                <Ionicons name="checkmark-circle" size={16} color={colors.risk.none.fg} />
                <T variant="footnote" weight="600" color={colors.risk.none.fg}>
                  Verified real address
                </T>
              </View>
            </View>
          </View>
          <View style={styles.urlBox}>
            <T variant="mono">{chosen.launchUrl.replace(/^https:\/\//, "")}</T>
          </View>
          <Button title={`Open ${chosen.name}`} icon="open-outline" accessibilityRole="link" onPress={() => Linking.openURL(chosen.launchUrl)} />
          <T variant="footnote" color={colors.muted} style={{ textAlign: "center" }}>
            Opens in Safari. Never type passwords into a site someone texted you.
          </T>
        </View>
      )}

      {options.length > 0 && (
        <View style={{ gap: spacing.smd }}>
          <T variant="headline" style={{ marginHorizontal: spacing.xs }} accessibilityRole="header">
            {said.trim() ? (match.brand ? "Or did you mean" : "Did you mean") : "Popular sites"}
          </T>
          <View style={styles.grid}>
            {options.map((b) => (
              <Pressable
                key={b.id}
                accessibilityRole="button"
                accessibilityLabel={`${b.name}, ${b.launchUrl}`}
                onPress={() => choose(b)}
                style={({ pressed }) => [styles.siteCard, pressed && { backgroundColor: colors.pressed }]}
              >
                <InitialBadge name={b.name} />
                <View style={{ flex: 1 }}>
                  <T variant="subhead" weight="600" numberOfLines={1}>
                    {b.name}
                  </T>
                  <T variant="caption" color={colors.muted} numberOfLines={1}>
                    {b.launchUrl.replace(/^https:\/\/(www\.)?/, "")}
                  </T>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {said.trim().length > 0 && !chosen && !match.unknownAddress && options.length === 0 && (
        <T variant="callout" color={colors.muted} style={{ marginHorizontal: spacing.xs }}>
          That one isn&apos;t on our verified list yet. Try the company&apos;s full name.
        </T>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  micOuter: { width: 132, height: 132, borderRadius: 66, backgroundColor: colors.card, boxShadow: shadows.raised, alignItems: "center", justifyContent: "center" },
  micInner: { width: 104, height: 104, borderRadius: 52, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.smd },
  siteCard: {
    width: "48%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderCurve: "continuous",
    padding: spacing.smd,
    boxShadow: shadows.card,
  },
  field: {
    backgroundColor: colors.card,
    boxShadow: shadows.card,
    borderRadius: radius.xl,
    borderCurve: "continuous",
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.smd,
    minHeight: 60,
  },
  input: { flex: 1, color: colors.ink, paddingVertical: spacing.smd },
  lock: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.risk.none.bg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.xs,
  },
  answer: {
    backgroundColor: colors.card,
    boxShadow: shadows.card,
    borderRadius: radius.xxl,
    borderCurve: "continuous",
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 2,
    borderColor: colors.verifiedOutline, // soft green outline: this is the verified answer
  },
  urlBox: { backgroundColor: colors.bg, borderRadius: radius.md, borderCurve: "continuous", padding: spacing.md, alignItems: "center" },
});
