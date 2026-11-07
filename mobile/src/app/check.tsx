import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EXAMPLES } from "@shared/examples";
import { ScreenHeader } from "@/components/ScreenHeader";
import { T, useSettings } from "@/settings";
import { colors, radius } from "@/theme";

export default function CheckScreen() {
  const router = useRouter();
  const { scale } = useSettings();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const check = (value: string) => {
    if (!value.trim()) {
      setError("Paste or type a message first.");
      return;
    }
    setError(null);
    router.push({ pathname: "/result", params: { text: value.slice(0, 5000) } });
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <ScreenHeader title="Check a message" />

          <View style={styles.hero}>
            <T size={22} weight="800" color={colors.white}>
              Paste the text or link you got
            </T>
            <T size={15} color="rgba(255,255,255,0.85)" style={{ marginTop: 4 }}>
              It&apos;s checked right here on your phone.
            </T>
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              maxLength={5000}
              placeholder="For example: Your account is locked. Verify now at…"
              placeholderTextColor="#8A93A8"
              accessibilityLabel="Message to check"
              style={[styles.input, { fontSize: Math.round(18 * scale), minHeight: 150 * scale }]}
            />
            <View style={styles.row}>
              {Clipboard.isPasteButtonAvailable ? (
                // Apple's own Paste button: no "Allow paste?" pop-up every time.
                <Clipboard.ClipboardPasteButton
                  acceptedContentTypes={["plain-text"]}
                  displayMode="iconAndLabel"
                  backgroundColor={colors.white}
                  foregroundColor={colors.blue}
                  style={{ flex: 1, height: 52 }}
                  onPress={(data) => {
                    if (data.type === "text") setText(data.text);
                  }}
                />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={async () => setText(await Clipboard.getStringAsync())}
                  style={styles.pasteFallback}
                >
                  <Ionicons name="clipboard-outline" size={20} color={colors.blue} />
                  <T size={17} weight="700" color={colors.blue}>
                    Paste
                  </T>
                </Pressable>
              )}
              {text.length > 0 && (
                <Pressable accessibilityRole="button" onPress={() => setText("")} style={styles.clear}>
                  <T size={17} weight="700" color={colors.white}>
                    Clear
                  </T>
                </Pressable>
              )}
            </View>
          </View>

          {error && (
            <T size={17} weight="700" color={colors.risk.high.fg} style={{ marginTop: 14 }} accessibilityRole="alert">
              {error}
            </T>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => check(text)}
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="shield-checkmark" size={22} color={colors.white} />
            <T size={20} weight="800" color={colors.white}>
              Check it
            </T>
          </Pressable>

          <T size={19} weight="800" style={{ marginTop: 28 }}>
            Or try an example
          </T>
          <View style={{ marginTop: 10, gap: 10 }}>
            {EXAMPLES.map((ex, i) => (
              <Pressable
                key={ex.id}
                accessibilityRole="button"
                accessibilityLabel={`Example: ${ex.label}`}
                onPress={() => {
                  setText(ex.text);
                  check(ex.text);
                }}
                style={({ pressed }) => [styles.option, pressed && { borderColor: colors.blue }]}
              >
                <View style={styles.letter}>
                  <T size={16} weight="800" color={colors.blue}>
                    {String.fromCharCode(65 + i)}
                  </T>
                </View>
                <View style={{ flex: 1 }}>
                  <T size={17} weight="700">
                    {ex.label}
                  </T>
                  <T size={14} color={colors.muted} numberOfLines={1}>
                    {ex.text}
                  </T>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 48 },
  hero: { marginTop: 8, backgroundColor: colors.blue, borderRadius: radius.card, padding: 20 },
  input: {
    marginTop: 14,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    color: colors.ink,
    textAlignVertical: "top",
  },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  pasteFallback: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  clear: { height: 52, paddingHorizontal: 20, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center" },
  cta: {
    marginTop: 18,
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
