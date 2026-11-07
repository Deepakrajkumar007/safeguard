import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import type { CheckReport, Evidence, LinkReport } from "@shared/types";
import { T } from "@/settings";
import { colors, radius } from "@/theme";

type IconName = keyof typeof Ionicons.glyphMap;

/** Big score circle, like the reference's trophy circle. Ring color = risk level. */
export function ScoreCircle({ report }: { report: CheckReport }) {
  const c = colors.risk[report.level];
  return (
    <View
      accessible
      accessibilityLabel={`Risk score ${report.score} out of 100. ${c.label}.`}
      style={{
        alignSelf: "center",
        width: 190,
        height: 190,
        borderRadius: 95,
        backgroundColor: c.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 150,
          height: 150,
          borderRadius: 75,
          backgroundColor: colors.white,
          borderWidth: 10,
          borderColor: c.fg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <T size={54} weight="800" color={c.fg} style={{ lineHeight: 60 }}>
          {report.score}
        </T>
        <T size={13} weight="600" color={colors.muted}>
          out of 100
        </T>
      </View>
    </View>
  );
}

/** Teal (no flags) to amber (careful) to red (high), with a knob at the score. Words label each zone too. */
export function RiskMeter({ score }: { score: number }) {
  const pos = Math.max(3, Math.min(97, score));
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ height: 30, justifyContent: "center" }}>
        <LinearGradient
          colors={["#2DD4BF", "#5EEAD4", "#FBBF24", "#FB923C", "#F43F5E", "#E11D48"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ height: 14, borderRadius: 7 }}
        />
        <View
          style={{
            position: "absolute",
            left: `${pos}%`,
            marginLeft: -14,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colors.white,
            borderWidth: 5,
            borderColor: colors.ink,
          }}
        />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
        <T size={13} weight="600" color={colors.muted}>
          No red flags
        </T>
        <T size={13} weight="600" color={colors.muted}>
          Be careful
        </T>
        <T size={13} weight="600" color={colors.muted}>
          High risk
        </T>
      </View>
    </View>
  );
}

function Tile({ icon, big, small, bg }: { icon: IconName; big: string; small: string; bg: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 22, padding: 14, gap: 6, minHeight: 112 }}>
      <Ionicons name={icon} size={22} color={colors.ink} />
      <T size={18} weight="800" numberOfLines={2}>
        {big}
      </T>
      <T size={13} color={colors.muted}>
        {small}
      </T>
    </View>
  );
}

/** Pastel stat tiles, like the reference's XP / Streak / Accuracy row. */
export function StatTiles({ report }: { report: CheckReport }) {
  const risky = report.evidence.filter((e) => !e.good).length;
  const links = report.links.length;
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <Tile icon="speedometer-outline" big={`${report.score}`} small="Risk score" bg={colors.risk[report.level].bg} />
      <Tile icon="alert-circle-outline" big={`${risky}`} small={risky === 1 ? "Warning sign" : "Warning signs"} bg={colors.lilac} />
      <Tile icon="link-outline" big={`${links}`} small={links === 1 ? "Link checked" : "Links checked"} bg={colors.sky} />
    </View>
  );
}

function evidenceIcon(e: Evidence): IconName {
  if (e.good) return "checkmark";
  if (e.source === "link") return "link";
  if (e.source === "phone") return "call";
  return "chatbubble-ellipses";
}

/** "Why we flagged it" list, styled like the reference's ranked rows. */
export function EvidenceList({ items }: { items: Evidence[] }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.card, paddingHorizontal: 16 }}>
      {items.map((e, i) => {
        const strong = e.weight >= 40;
        const tint = e.good ? colors.risk.none : strong ? colors.risk.high : colors.risk.caution;
        return (
          <View
            key={`${e.id}-${i}`}
            style={{
              flexDirection: "row",
              gap: 12,
              paddingVertical: 16,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: colors.line,
            }}
          >
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: tint.bg, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={evidenceIcon(e)} size={20} color={tint.fg} />
            </View>
            <View style={{ flex: 1 }}>
              <T size={17} weight="700">
                {e.title}
              </T>
              <T size={15} color={colors.muted} style={{ marginTop: 2 }}>
                {e.detail}
              </T>
            </View>
            <View style={{ alignSelf: "flex-start", backgroundColor: tint.bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
              <T size={13} weight="800" color={tint.fg}>
                {e.good ? "Real site" : `+${e.weight}`}
              </T>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Which part of a web address matters: the underlined part is who owns the site. */
export function LinkBreakdown({ link }: { link: LinkReport }) {
  const host = link.hostname;
  const owner = link.domain && host.endsWith(link.domain) ? link.domain : host;
  const before = owner === host ? "" : host.slice(0, host.length - owner.length);
  const ok = Boolean(link.officialBrand);
  return (
    <View style={{ backgroundColor: colors.bg, borderRadius: radius.row, padding: 14 }}>
      <T size={17} style={{ fontFamily: "Menlo" }}>
        <T size={17} color={colors.muted} style={{ fontFamily: "Menlo" }}>
          {before}
        </T>
        <T
          size={17}
          weight="800"
          color={ok ? colors.risk.none.fg : colors.risk.high.fg}
          style={{ fontFamily: "Menlo", textDecorationLine: "underline" }}
        >
          {owner}
        </T>
      </T>
      <T size={14} color={colors.muted} style={{ marginTop: 6 }}>
        {ok ? `This goes to ${link.officialBrand}'s real website.` : `The underlined part is the real website: ${owner}`}
      </T>
    </View>
  );
}

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.card, padding: 18, gap: 12 }}>
      <T size={20} weight="800" accessibilityRole="header">
        {title}
      </T>
      {children}
    </View>
  );
}

export function NextSteps({ report }: { report: CheckReport }) {
  const urgent = report.level === "high" || report.level === "caution";
  return (
    <Card title={urgent ? "What to do now" : "Good habits"}>
      {report.nextSteps.map((s, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 12 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: urgent && i === 0 ? colors.risk.high.fg : colors.bg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <T size={15} weight="800" color={urgent && i === 0 ? colors.white : colors.ink}>
              {i + 1}
            </T>
          </View>
          <T size={17} weight={urgent && i === 0 ? "800" : "400"} style={{ flex: 1, paddingTop: 4 }}>
            {s}
          </T>
        </View>
      ))}
    </Card>
  );
}
