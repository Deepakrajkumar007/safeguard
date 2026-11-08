import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, useColorScheme, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { T } from "@/settings";
import { colors, palettes, radius, shadows, spacing } from "@/theme";
import type { IconName } from "./List";

/** White card with soft shadow. */
export function Card({ children, padded = true }: { children: ReactNode; padded?: boolean }) {
  return <View style={[styles.card, padded && { padding: spacing.md }]}>{children}</View>;
}

export interface Stat {
  value: string;
  label: string;
  tone?: "high" | "none";
}

/** 2x2 stats grid, like the reference's house-status card. */
export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <View style={[styles.card, styles.statGrid]}>
      {stats.map((s, i) => (
        <View
          key={s.label}
          style={[styles.stat, i % 2 === 0 && styles.statRightLine, i < stats.length - 2 && styles.statBottomLine]}
          accessible
          accessibilityLabel={`${s.label}: ${s.value}`}
        >
          <T variant="stat" color={s.tone ? colors.risk[s.tone].fg : colors.ink}>
            {s.value}
          </T>
          <T variant="footnote" color={colors.muted}>
            {s.label}
          </T>
        </View>
      ))}
    </View>
  );
}

/** Square feature card, like the reference's "Routines" tiles. `highlight` gets the brand gradient. */
export function FeatureTile({
  icon,
  label,
  color,
  highlight,
  onPress,
}: {
  icon: IconName;
  label: string;
  color: string;
  highlight?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.85 : 1 }]}>
      {highlight && <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius.xl }]} />}
      <View style={[styles.tileIcon, { backgroundColor: highlight ? "rgba(255,255,255,0.22)" : color }]}>
        <Ionicons name={icon} size={22} color={colors.white} />
      </View>
      <T variant="subhead" weight="600" color={highlight ? colors.white : colors.ink} style={{ textAlign: "center" }}>
        {label}
      </T>
    </Pressable>
  );
}

/** Small rounded mode button, like the reference's Cool / Heat / Fan / Auto. */
export function Chip({ icon, label, active }: { icon: IconName; label: string; active?: boolean }) {
  return (
    <View style={{ alignItems: "center", gap: spacing.xs, flex: 1 }}>
      <View style={[styles.chip, active && { backgroundColor: colors.violetSoft }]}>
        <Ionicons name={icon} size={22} color={active ? colors.violet : colors.muted} />
      </View>
      <T variant="caption" color={colors.muted} style={{ textAlign: "center" }}>
        {label}
      </T>
    </View>
  );
}

/** Circular dial, like the reference's thermostat. `progress` 0..1. */
export function Ring({ progress, size = 210, stroke = 16, tone = "brand", children }: { progress: number; size?: number; stroke?: number; tone?: "brand" | "high" | "none"; children: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  const ends = tone === "high" ? colors.ringHigh : tone === "none" ? colors.ringNone : colors.gradient;
  const track = palettes[useColorScheme() === "dark" ? "dark" : "light"].separator; // SVG needs a plain color
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={ends[0]} />
            <Stop offset="1" stopColor={ends[1]} />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {p > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="url(#ring)"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - p)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <View style={{ alignItems: "center", paddingHorizontal: stroke * 2 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.xxl, borderCurve: "continuous", boxShadow: shadows.card },
  statGrid: { flexDirection: "row", flexWrap: "wrap", paddingVertical: spacing.xs },
  stat: { width: "50%", alignItems: "center", paddingVertical: spacing.md, gap: 2 },
  statRightLine: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.separator },
  statBottomLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  tile: {
    flex: 1,
    minHeight: 112,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderCurve: "continuous",
    boxShadow: shadows.card,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.smd,
    overflow: "hidden",
  },
  tileIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  chip: { width: 56, height: 56, borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: colors.card, boxShadow: shadows.card, alignItems: "center", justifyContent: "center" },
});
