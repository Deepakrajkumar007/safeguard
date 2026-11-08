import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputInstance } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Brand } from "@shared/brands";
import { matchSpoken, POPULAR, spokenAddress } from "@shared/launcher";
import { ScreenHeader } from "@/components/ScreenHeader";
import { T, useSettings } from "@/settings";
import { speak } from "@/speech";
import { colors, radius } from "@/theme";

/**
 * Voice launcher. The person says or types a NAME ("Chase"). We show the real address from the
 * verified list and open exactly that. Speech is never turned into a web address.
 */
export default function OpenSite() {
  const router = useRouter();
  const { scale, autoRead } = useSettings();
  // Optional prefill for demos: /open?q=chase
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [said, setSaid] = useState(typeof q === "string" ? q : "");
  const [picked, setPicked] = useState<Brand | null>(null);
  const inputRef = useRef<TextInputInstance>(null);

  const match = useMemo(() => matchSpoken(said), [said]);
  const chosen = picked ?? match.brand;

  const choose = (b: Brand) => {
    setPicked(b);
    if (autoRead) void speak(`${b.name}. The real website is ${spokenAddress(b.launchUrl)}.`);
  };

  const options = said.trim() ? match.suggestions : POPULAR;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <ScreenHeader title="Open a site" />

          <View style={styles.hero}>
            <T size={22} weight="800" color={colors.white}>
              Which website do you want?
            </T>
            <T size={15} color="rgba(255,255,255,0.88)" style={{ marginTop: 4 }}>
              Tap the box, then tap the microphone on your keyboard and say the name, like &quot;Chase&quot;.
            </T>
            <View style={styles.inputRow}>
              <Ionicons name="mic" size={24} color={colors.blue} />
              <TextInput
                ref={inputRef}
                value={said}
                onChangeText={(v) => {
                  setSaid(v);
                  setPicked(null);
                }}
                placeholder="Say or type a name"
                placeholderTextColor="#8A93A8"
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="done"
                accessibilityLabel="Website name"
                style={[styles.input, { fontSize: Math.round(20 * scale) }]}
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
                  <Ionicons name="close-circle" size={24} color={colors.muted} />
                </Pressable>
              )}
            </View>
            <View style={styles.lock}>
              <Ionicons name="lock-closed" size={13} color="#0B7A55" />
              <T size={12} weight="800" color="#0B7A55">
                We only open addresses from our verified list
              </T>
            </View>
          </View>

          {/* Unknown web address typed: never open it. */}
          {match.unknownAddress && !picked && (
            <View style={[styles.notice, { backgroundColor: colors.risk.caution.bg, flexDirection: "column" }]}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Ionicons name="warning" size={22} color={colors.risk.caution.fg} />
                <T size={16} weight="700" color={colors.risk.caution.fg} style={{ flex: 1 }}>
                  That address isn&apos;t on our verified list, so we won&apos;t open it. Say the company&apos;s name instead.
                </T>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: "/result", params: { text: said.trim() } })}
                style={({ pressed }) => [styles.checkLink, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="shield-checkmark" size={20} color={colors.white} />
                <T size={17} weight="800" color={colors.white}>
                  Check this link
                </T>
              </Pressable>
            </View>
          )}

          {/* The verified answer, styled like the reference's correct-answer row. */}
          {chosen && (
            <View style={styles.answer} accessible accessibilityLabel={`${chosen.name}. Verified address ${chosen.launchUrl}`}>
              <View style={styles.rowBetween}>
                <View style={styles.badge}>
                  <T size={18} weight="800" color={colors.white}>
                    {chosen.name.charAt(0)}
                  </T>
                </View>
                <View style={{ flex: 1 }}>
                  <T size={22} weight="800">
                    {chosen.name}
                  </T>
                  <View style={styles.verified}>
                    <Ionicons name="checkmark-circle" size={16} color="#0B7A55" />
                    <T size={13} weight="800" color="#0B7A55">
                      Verified real address
                    </T>
                  </View>
                </View>
              </View>
              <View style={styles.urlBox}>
                <T size={21} weight="800" style={{ fontFamily: "Menlo" }}>
                  {chosen.launchUrl.replace(/^https:\/\//, "")}
                </T>
              </View>
              <Pressable
                accessibilityRole="link"
                onPress={() => Linking.openURL(chosen.launchUrl)}
                style={({ pressed }) => [styles.openBtn, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="open-outline" size={22} color={colors.white} />
                <T size={20} weight="800" color={colors.white}>
                  Open {chosen.name}
                </T>
              </Pressable>
              <T size={13} color={colors.muted} style={{ textAlign: "center" }}>
                Opens in Safari. Never type passwords into a site someone texted you.
              </T>
            </View>
          )}

          {/* Suggestions or popular sites, styled like quiz answers. */}
          {options.length > 0 && !(chosen && options.length === 0) && (
            <>
              <T size={19} weight="800" style={{ marginTop: 24, marginBottom: 10 }}>
                {said.trim() ? (match.brand ? "Or did you mean" : "Did you mean") : "Popular sites"}
              </T>
              <View style={{ gap: 10 }}>
                {options
                  .filter((b) => b.id !== chosen?.id)
                  .map((b, i) => (
                    <Pressable
                      key={b.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${b.name}, ${b.launchUrl}`}
                      onPress={() => choose(b)}
                      style={({ pressed }) => [styles.option, pressed && { borderColor: colors.blue }]}
                    >
                      <View style={styles.letter}>
                        <T size={16} weight="800" color={colors.blue}>
                          {String.fromCharCode(65 + i)}
                        </T>
                      </View>
                      <View style={{ flex: 1 }}>
                        <T size={18} weight="700">
                          {b.name}
                        </T>
                        <T size={14} color={colors.muted}>
                          {b.launchUrl.replace(/^https:\/\//, "")}
                        </T>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                    </Pressable>
                  ))}
              </View>
            </>
          )}

          {said.trim().length > 0 && !chosen && !match.unknownAddress && options.length === 0 && (
            <View style={[styles.notice, { backgroundColor: colors.card }]}>
              <Ionicons name="help-circle" size={22} color={colors.muted} />
              <T size={16} color={colors.muted} style={{ flex: 1 }}>
                We don&apos;t have that one on our verified list yet. Try the company&apos;s full name.
              </T>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 48 },
  rowBetween: { flexDirection: "row", alignItems: "center", gap: 12 },
  hero: { marginTop: 8, backgroundColor: colors.blue, borderRadius: radius.card, padding: 20 },
  inputRow: {
    marginTop: 14,
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 60,
  },
  input: { flex: 1, color: colors.ink, paddingVertical: 14 },
  lock: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#C9F7DF",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  checkLink: {
    marginTop: 12,
    backgroundColor: colors.ink,
    borderRadius: radius.row,
    paddingVertical: 14,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  notice: { marginTop: 16, borderRadius: radius.row, padding: 16, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  answer: {
    marginTop: 18,
    backgroundColor: colors.risk.none.bg,
    borderRadius: radius.card,
    padding: 18,
    gap: 14,
    borderWidth: 3,
    borderColor: "#7BE0B3",
  },
  badge: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  verified: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  urlBox: { backgroundColor: colors.white, borderRadius: radius.row, padding: 14, alignItems: "center" },
  openBtn: {
    backgroundColor: colors.ink,
    borderRadius: radius.row,
    paddingVertical: 18,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: radius.row,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.card,
  },
  letter: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.blueSoft, alignItems: "center", justifyContent: "center" },
});
