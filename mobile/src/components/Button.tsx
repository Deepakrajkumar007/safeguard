import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { T } from "@/settings";
import { colors, radius, spacing } from "@/theme";
import type { IconName } from "./List";

const variants = {
  primary: { bg: colors.blue, fg: colors.white, border: colors.blue },
  dark: { bg: colors.ink, fg: colors.white, border: colors.ink },
  secondary: { bg: colors.card, fg: colors.blue, border: colors.blueSoft },
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
  const v = variants[variant];
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      <View style={styles.inner}>
        {loading ? <ActivityIndicator color={v.fg} /> : icon ? <Ionicons name={icon} size={20} color={v.fg} /> : null}
        <T variant="headline" color={v.fg}>
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
  base: { minHeight: 54, borderRadius: radius.md, borderCurve: "continuous", borderWidth: 2, justifyContent: "center", paddingHorizontal: spacing.md },
  inner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  notice: { flexDirection: "row", gap: spacing.smd, padding: spacing.md, borderRadius: radius.lg, borderCurve: "continuous", alignItems: "flex-start" },
});
