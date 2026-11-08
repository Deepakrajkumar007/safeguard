// LinkGuard design tokens: the single source of truth for color, spacing, type, radius, and shadow.
// Look: soft lavender background, white cards with gentle shadows, a blue-to-violet brand gradient
// (inspired by a smart-home dashboard). Risk keeps its own green / amber / red so "danger" never looks
// like the brand. The app is light-only (app.json).
import type { TextStyle } from "react-native";

export const colors = {
  // Surfaces
  bg: "#F4F5FB",
  card: "#FFFFFF",
  separator: "#E6E8F2",
  pressed: "#EEF0F8", // row highlight while pressed
  // Text
  ink: "#1B1E3C", // primary label
  muted: "#6B7090", // secondary label (meets contrast on white and bg)
  placeholder: "#9AA0B8",
  chevron: "#B3B8CC",
  white: "#FFFFFF",
  // Brand
  blue: "#4F6BFF", // actions, links, switches
  violet: "#7B5CFF",
  blueSoft: "#ECEFFF",
  violetSoft: "#F0ECFF",
  gradient: ["#5B7CFF", "#7B5CFF"] as const, // brand gradient (header, primary button, selected tile)
  onGradientMuted: "rgba(255,255,255,0.82)",
  verifiedOutline: "#9BE3C3",
  ringHigh: ["#FF7A9A", "#C21640"] as const, // dial gradient when risky emails were found
  ringNone: ["#4CD7A4", "#0B7A55"] as const, // dial gradient when none were found
  // Feature tiles
  tile: { gmail: "#FF7A45", web: "#19B07B", texts: "#7B5CFF", settings: "#6B7090" },
  risk: {
    none: { fg: "#0B7A55", bg: "#DDF6EA", label: "No red flags" },
    low: { fg: "#3A50D9", bg: "#ECEFFF", label: "Small signs" },
    caution: { fg: "#9A4A00", bg: "#FFEFD6", label: "Be careful" },
    high: { fg: "#C21640", bg: "#FFE3E8", label: "High risk" },
  },
} as const;

// 4-point grid. 12 and 20 are named steps because they recur.
export const spacing = { xs: 4, sm: 8, smd: 12, md: 16, mdl: 20, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, full: 9999 } as const;

// Soft, low shadows (iOS is a low-shadow platform). boxShadow strings.
export const shadows = {
  card: "0 6px 18px rgba(70, 80, 150, 0.08)",
  raised: "0 10px 24px rgba(70, 80, 150, 0.14)",
} as const;

// Apple text-style ramp (sizes at the default text setting; "Larger text" scales them).
export const type = {
  largeTitle: { fontSize: 32, fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "700" },
  headline: { fontSize: 17, fontWeight: "600" },
  body: { fontSize: 17, fontWeight: "400" },
  callout: { fontSize: 16, fontWeight: "400" },
  subhead: { fontSize: 15, fontWeight: "400" },
  footnote: { fontSize: 13, fontWeight: "400" },
  caption: { fontSize: 12, fontWeight: "400" },
  stat: { fontSize: 24, fontWeight: "700" },
  mono: { fontSize: 20, fontWeight: "700", fontFamily: "Menlo" },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;
