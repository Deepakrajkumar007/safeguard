import { Ionicons } from "@expo/vector-icons";
import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { T } from "@/settings";
import { colors, radius, spacing } from "@/theme";

export type IconName = keyof typeof Ionicons.glyphMap;

/** iOS inset-grouped section: small header, white rounded group with hairline separators, optional footer. */
export function Section({ title, footer, children }: { title?: string; footer?: ReactNode; children: ReactNode }) {
  const rows = Children.toArray(children).filter((c) => isValidElement(c));
  return (
    <View style={{ gap: spacing.sm }}>
      {title && (
        <T variant="footnote" color={colors.muted} style={styles.sectionTitle} accessibilityRole="header">
          {title.toUpperCase()}
        </T>
      )}
      <View style={styles.group}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={styles.separator} />}
            {row}
          </Fragment>
        ))}
      </View>
      {footer != null && (
        <T variant="footnote" color={colors.muted} style={styles.footer}>
          {footer}
        </T>
      )}
    </View>
  );
}

/** Colored rounded-square icon, like iOS Settings rows. */
export function IconTile({ icon, color }: { icon: IconName; color: string }) {
  return (
    <View style={[styles.tile, { backgroundColor: color }]}>
      <Ionicons name={icon} size={18} color={colors.white} />
    </View>
  );
}

/** A brand's first letter in a soft circle (used instead of A/B/C badges). */
export function InitialBadge({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <View style={[styles.initial, { width: size, height: size, borderRadius: size / 2 }]}>
      <T variant="headline" color={colors.blue}>
        {name.charAt(0)}
      </T>
    </View>
  );
}

/**
 * One row. Tappable rows highlight on press and show a chevron; rows with a `right` element
 * (a switch, a button) don't.
 */
export function Row({
  title,
  subtitle,
  left,
  right,
  onPress,
  accessibilityLabel,
  numberOfLines,
}: {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  numberOfLines?: number;
}) {
  const content = (pressed: boolean) => (
    <View style={[styles.row, pressed && { backgroundColor: colors.pressed }]}>
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="body">{title}</T>
        {subtitle ? (
          <T variant="subhead" color={colors.muted} numberOfLines={numberOfLines}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.chevron} /> : null)}
    </View>
  );
  if (!onPress) return <View accessible={!right} accessibilityLabel={accessibilityLabel}>{content(false)}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} onPress={onPress}>
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { marginHorizontal: spacing.md, letterSpacing: 0.4 },
  group: { backgroundColor: colors.card, borderRadius: radius.lg, borderCurve: "continuous", overflow: "hidden" },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: spacing.md },
  footer: { marginHorizontal: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, paddingVertical: spacing.smd, minHeight: 56 },
  tile: { width: 32, height: 32, borderRadius: radius.sm, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  initial: { backgroundColor: colors.blueSoft, alignItems: "center", justifyContent: "center" },
});
