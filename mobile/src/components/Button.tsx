import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { T } from "@/settings";
import { colors, radius, shadows, spacing } from "@/theme";
import type { IconName } from "./List";

const variants = {
  primary: { fg: colors.white }, // brand gradient
  secondary: { fg: colors.blue },
  dark: { fg: colors.white },
} as const;

/** Big, full-width button. Large touch target for older hands. */
export function Button({
  title,
  icon,
  variant = "primary",
  loading,
  disabled,
  onPress,
  style,
  accessibilityRole = "button",
}: {
  title: string;
  icon?: IconName;
  variant?: keyof typeof variants;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: "button" | "link";
}) {
  const fg = variants[variant].fg;
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "secondary" && styles.secondary,
        variant === "dark" && { backgroundColor: colors.ink },
        variant === "primary" && { boxShadow: shadows.raised },
        { opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {variant === "primary" && (
        <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.round]} />
      )}
      <View style={styles.inner}>
        {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
        <T variant="headline" color={fg}>
          {title}
        </T>
      </View>
    </Pressable>
  );
}

/** A tinted message box for warnings, errors, and good news. */
export function Notice({ tone, icon, children }: { tone: "caution" | "high" | "none"; icon: IconName; children: string }) {
  const c = colors.risk[tone];
  return (
    <View style={[styles.notice, { backgroundColor: c.bg }]} accessibilityRole="alert">
      <Ionicons name={icon} size={20} color={c.fg} />
      <T variant="callout" weight="600" color={c.fg} style={{ flex: 1 }}>
        {children}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 56, borderRadius: radius.lg, borderCurve: "continuous", justifyContent: "center", paddingHorizontal: spacing.md, overflow: "hidden" },
  round: { borderRadius: radius.lg },
  secondary: { backgroundColor: colors.card, boxShadow: shadows.card },
  inner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  notice: { flexDirection: "row", gap: spacing.smd, padding: spacing.md, borderRadius: radius.xl, borderCurve: "continuous", alignItems: "flex-start" },
});
