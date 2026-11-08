// LinkGuard design tokens: the single source of truth for color, spacing, type, and radius.
// Blue-and-white, iOS "inset grouped" style. Brand blue is for actions; risk keeps its own
// green / amber / red so "danger" never looks like the brand. The app is light-only (app.json).
import type { TextStyle } from "react-native";

export const colors = {
  // Surfaces (iOS grouped style)
  bg: "#F2F4F8", // grouped background
  card: "#FFFFFF", // grouped rows / cells
  separator: "#D9DEE7",
  pressed: "#E9EDF5", // row highlight while pressed
  placeholder: "#8A93A8",
  chevron: "#A3ABBA",
  verifiedOutline: "#9BE3C3",
  // Text
  ink: "#0B1533", // primary label
  muted: "#5B6478", // secondary label (meets contrast on white and bg)
  // Brand
  blue: "#1E5EFF",
  blueSoft: "#E3EBFF",
  white: "#FFFFFF",
  // Row icon tiles (one per feature)
  tile: { gmail: "#E8590C", web: "#0B9E6F", texts: "#6D4AFF", settings: "#5B6478" },
  risk: {
    none: { fg: "#0B7A55", bg: "#DDF6EA", label: "No red flags" },
    low: { fg: "#1546C8", bg: "#E3EBFF", label: "Small signs" },
    caution: { fg: "#9A4A00", bg: "#FFEFD6", label: "Be careful" },
    high: { fg: "#C21640", bg: "#FFE3E8", label: "High risk" },
  },
} as const;

// 4-point grid. 12 and 20 are named steps because they recur.
export const spacing = { xs: 4, sm: 8, smd: 12, md: 16, mdl: 20, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 } as const;

// Apple text-style ramp (sizes at the default text setting; "Larger text" scales them).
export const type = {
  largeTitle: { fontSize: 34, fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "700" },
  headline: { fontSize: 17, fontWeight: "600" },
  body: { fontSize: 17, fontWeight: "400" },
  callout: { fontSize: 16, fontWeight: "400" },
  subhead: { fontSize: 15, fontWeight: "400" },
  footnote: { fontSize: 13, fontWeight: "400" },
  caption: { fontSize: 12, fontWeight: "400" },
  mono: { fontSize: 20, fontWeight: "700", fontFamily: "Menlo" },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;
