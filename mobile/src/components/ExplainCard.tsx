import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import type { Explanation } from "@shared/explain";
import { fetchExplanation } from "@/api";
import { T } from "@/settings";
import { speak, stopSpeaking } from "@/speech";
import { colors, radius } from "@/theme";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: Explanation }
  | { status: "error"; message: string };

const OPINION: Record<Explanation["second_opinion"], { text: string; bg: string; fg: string }> = {
  agrees: { text: "The AI agrees with the score", bg: colors.bg, fg: colors.ink },
  more_concerned: { text: "The AI is MORE worried than the score", bg: colors.risk.high.bg, fg: colors.risk.high.fg },
  less_concerned: { text: "The AI is less worried than the score", bg: colors.blueSoft, fg: colors.blueDark },
};

/**
 * Tap-to-explain. The verdict above is computed on the phone; the message is only sent to the
 * server (and Google Gemini) when the person taps this button.
 */
export function ExplainCard({ text }: { text: string }) {
  const [state, setState] = useState<State>({ status: "idle" });
  const [speaking, setSpeaking] = useState(false);

  const run = async () => {
    setState({ status: "loading" });
    const r = await fetchExplanation(text);
    setState(r.ok ? { status: "done", data: r.data } : { status: "error", message: r.message });
  };

  const toggleSpeak = (e: Explanation) => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      void speak(`${e.explanation} ${e.most_important_step}`, () => setSpeaking(false));
    }
  };

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.card, padding: 18, gap: 12 }} accessibilityLiveRegion="polite">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.lilac, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="sparkles" size={22} color="#6D4AFF" />
        </View>
        <View style={{ flex: 1 }}>
          <T size={20} weight="800" accessibilityRole="header">
            In plain English
          </T>
          <T size={13} color={colors.muted}>
            Written by AI (Google Gemini). The score comes from LinkGuard&apos;s checks, not the AI.
          </T>
        </View>
      </View>

      {state.status === "idle" && (
        <>
          <Pressable
            accessibilityRole="button"
            onPress={run}
            style={({ pressed }) => ({
              backgroundColor: "#6D4AFF",
              opacity: pressed ? 0.85 : 1,
              borderRadius: radius.row,
              paddingVertical: 16,
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Ionicons name="sparkles" size={20} color={colors.white} />
            <T size={18} weight="800" color={colors.white}>
              Explain it simply
            </T>
          </Pressable>
          <T size={13} color={colors.muted}>
            This sends the message to Google&apos;s Gemini AI to write the explanation. Nothing is saved by LinkGuard.
          </T>
        </>
      )}

      {state.status === "loading" && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}>
          <ActivityIndicator color="#6D4AFF" />
          <T size={16} color={colors.muted}>
            The AI is reading the evidence…
          </T>
        </View>
      )}

      {state.status === "error" && (
        <>
          <T size={16} color={colors.muted}>
            {state.message}
          </T>
          <Pressable accessibilityRole="button" onPress={run} style={{ alignSelf: "flex-start", paddingVertical: 6 }}>
            <T size={16} weight="800" color={colors.blue}>
              Try again
            </T>
          </Pressable>
        </>
      )}

      {state.status === "done" && (
        <>
          <T size={18}>{state.data.explanation}</T>
          <View style={{ backgroundColor: colors.bg, borderRadius: radius.row, padding: 14 }}>
            <T size={12} weight="800" color={colors.muted} style={{ letterSpacing: 1 }}>
              MOST IMPORTANT
            </T>
            <T size={17} weight="800" style={{ marginTop: 2 }}>
              {state.data.most_important_step}
            </T>
          </View>
          <View style={{ alignSelf: "flex-start", backgroundColor: OPINION[state.data.second_opinion].bg, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
            <T size={13} weight="800" color={OPINION[state.data.second_opinion].fg}>
              {OPINION[state.data.second_opinion].text}
            </T>
          </View>
          <T size={14} color={colors.muted}>
            {state.data.second_opinion_reason}
          </T>
          <Pressable
            accessibilityRole="button"
            onPress={() => toggleSpeak(state.data)}
            style={{ flexDirection: "row", gap: 8, alignItems: "center", alignSelf: "flex-start", paddingVertical: 6 }}
          >
            <Ionicons name={speaking ? "stop" : "volume-high"} size={20} color={colors.blue} />
            <T size={16} weight="800" color={colors.blue}>
              {speaking ? "Stop reading" : "Read this aloud"}
            </T>
          </Pressable>
        </>
      )}
    </View>
  );
}
