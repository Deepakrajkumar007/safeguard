import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { checkMessage } from "@shared/checker";
import { NOT_LISTED_NOTE, reputationEvidence, type ReputationResult } from "@shared/reputation";
import { reportToSpeech } from "@shared/speech-text";
import { fetchReputation } from "@/api";
import { ExplainCard } from "@/components/ExplainCard";
import { Card, EvidenceList, LinkBreakdown, NextSteps, RiskMeter, ScoreCircle, StatTiles } from "@/components/ResultParts";
import { ScreenHeader } from "@/components/ScreenHeader";
import { T, useSettings } from "@/settings";
import { speak, stopSpeaking } from "@/speech";
import { colors, radius } from "@/theme";

export default function ResultScreen() {
  const router = useRouter();
  const { text } = useLocalSearchParams<{ text?: string }>();
  const { autoRead } = useSettings();
  // Starts "speaking" when auto read-aloud is on; the effect below begins the speech.
  const [speaking, setSpeaking] = useState(autoRead);

  // The verdict is computed on the phone by the same checker the server uses.
  const base = useMemo(() => checkMessage(String(text ?? "")), [text]);
  // Then only the LINKS are checked against Google's list of dangerous sites (via our server).
  const [rep, setRep] = useState<ReputationResult | null>(null);
  const report = useMemo(() => {
    if (!rep) return base;
    const r = checkMessage(String(text ?? ""), { extraEvidence: reputationEvidence(rep) });
    if (rep.checked && rep.flagged.length === 0 && r.links.length > 0 && (r.level === "none" || r.level === "low")) {
      r.evidence.push(NOT_LISTED_NOTE);
    }
    return r;
  }, [base, rep, text]);

  useEffect(() => {
    if (base.links.length === 0) return;
    let alive = true;
    void fetchReputation(base.links.map((l) => l.input)).then((r) => {
      if (!alive || !r) return;
      setRep(r);
      if (r.flagged.length > 0 && autoRead) void speak("Update. Google lists this website as dangerous. Do not open it.");
    });
    return () => {
      alive = false;
    };
    // Look up once per message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);
  const spoken = useMemo(() => reportToSpeech(report), [report]);
  const level = colors.risk[report.level];

  useEffect(() => {
    if (autoRead) void speak(spoken, () => setSpeaking(false));
    return () => stopSpeaking();
    // Read once when the result opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSpeak = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      void speak(spoken, () => setSpeaking(false));
    }
  };

  const reasons = report.evidence.filter((e) => !e.good);
  const goods = report.evidence.filter((e) => e.good);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.page}>
        <ScreenHeader
          title="Result"
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share this result"
              hitSlop={12}
              onPress={() =>
                Share.share({ message: `LinkGuard: ${report.headline}. ${report.summary} (Checked with LinkGuard.)` })
              }
            >
              <Ionicons name="share-outline" size={26} color={colors.ink} />
            </Pressable>
          }
        />

        <View style={{ marginTop: 8 }}>
          <ScoreCircle report={report} />
        </View>

        <T size={30} weight="800" color={level.fg} style={{ textAlign: "center", marginTop: 16 }} accessibilityRole="header">
          {report.level === "high" ? "High risk" : report.level === "caution" ? "Be careful" : report.headline}
        </T>
        {report.scamType && (
          <T size={18} weight="700" style={{ textAlign: "center", marginTop: 2 }}>
            {report.scamType.label}
          </T>
        )}
        <T size={17} color={colors.muted} style={{ textAlign: "center", marginTop: 8 }}>
          {report.summary}
        </T>

        <View style={{ marginTop: 20 }}>
          <RiskMeter score={report.score} />
        </View>

        <View style={{ marginTop: 20 }}>
          <StatTiles report={report} />
        </View>

        <View style={{ marginTop: 16 }}>
          <ExplainCard text={String(text ?? "")} />
        </View>

        {(reasons.length > 0 || goods.length > 0) && (
          <>
            <T size={21} weight="800" style={{ marginTop: 26, marginBottom: 10 }} accessibilityRole="header">
              {reasons.length ? "Why we flagged it" : "What we checked"}
            </T>
            <EvidenceList items={[...reasons, ...goods]} />
          </>
        )}

        {report.links.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Card title="Where the link really goes">
              <T size={15} color={colors.muted}>
                Only the end of a web address, right before the first &quot;/&quot;, tells you who owns it.
              </T>
              {report.links.map((l, i) => (
                <LinkBreakdown key={i} link={l} />
              ))}
            </Card>
          </View>
        )}

        <View style={{ marginTop: 16 }}>
          <NextSteps report={report} />
        </View>

        {(report.level === "high" || report.level === "caution") && (
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL("https://reportfraud.ftc.gov")}
            style={[styles.secondary, { marginTop: 16 }]}
          >
            <Ionicons name="flag-outline" size={20} color={colors.blue} />
            <T size={17} weight="800" color={colors.blue}>
              Report it at reportfraud.ftc.gov
            </T>
          </Pressable>
        )}

        <T size={13} color={colors.muted} style={{ textAlign: "center", marginTop: 18 }}>
          The message was checked on your phone{rep?.checked ? "; its links were also checked with Google Safe Browsing" : ""}. LinkGuard never says a
          message is &quot;safe&quot;, only whether it found warning signs.
        </T>
      </ScrollView>

      {/* Bottom actions, like the reference's "Play again" bar */}
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          onPress={toggleSpeak}
          style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name={speaking ? "stop" : "volume-high"} size={22} color={colors.white} />
          <T size={19} weight="800" color={colors.white}>
            {speaking ? "Stop reading" : "Read aloud"}
          </T>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Check another message"
          onPress={() => router.back()}
          style={styles.square}
        >
          <Ionicons name="refresh" size={24} color={colors.white} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 32 },
  bar: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6, backgroundColor: colors.bg },
  primary: {
    flex: 1,
    backgroundColor: colors.blue,
    borderRadius: radius.row,
    paddingVertical: 18,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  square: { width: 62, borderRadius: radius.row, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  secondary: {
    borderRadius: radius.row,
    borderWidth: 2,
    borderColor: colors.blue,
    paddingVertical: 14,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
