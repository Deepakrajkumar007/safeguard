// LinkGuard design tokens: the single source of truth for color, spacing, type, radius, and shadow.
// Look: soft lavender background, white cards with gentle shadows, a blue-to-violet brand gradient
// (inspired by a smart-home dashboard). Risk keeps its own green / amber / red so "danger" never looks
// like the brand.
//
// Dark mode: every surface/text/risk color is an iOS dynamic color (DynamicColorIOS), so iOS swaps it
// automatically when the app is light or dark (following the iPhone, or the in-app Appearance choice).
// Components that need a plain string (e.g. SVG strokes, navigation headers) read `palettes[scheme]`.
import { DynamicColorIOS, type NativeColorValue, type TextStyle } from "react-native";

const light = {
  bg: "#F4F5FB",
  card: "#FFFFFF",
  separator: "#E6E8F2",
  pressed: "#EEF0F8", // row highlight while pressed
  ink: "#1B1E3C", // primary label
  muted: "#6B7090", // secondary label (meets contrast on white and bg)
  placeholder: "#9AA0B8",
  chevron: "#B3B8CC",
  blue: "#4F6BFF", // actions, links, switches
  violet: "#7B5CFF",
  blueSoft: "#ECEFFF",
  violetSoft: "#F0ECFF",
  verifiedOutline: "#9BE3C3",
  noneFg: "#0B7A55",
  noneBg: "#DDF6EA",
  lowFg: "#3A50D9",
  lowBg: "#ECEFFF",
  cautionFg: "#9A4A00",
  cautionBg: "#FFEFD6",
  highFg: "#C21640",
  highBg: "#FFE3E8",
};

const dark: typeof light = {
  bg: "#0E1020",
  card: "#1A1D31",
  separator: "#2B2F47",
  pressed: "#24283E",
  ink: "#EEF0FA",
  muted: "#A6ABC6", // meets contrast on card and bg
  placeholder: "#6F7492",
  chevron: "#5B6080",
  blue: "#8095FF", // lighter so links and switches read on dark
  violet: "#A28CFF",
  blueSoft: "#232A4F",
  violetSoft: "#2B2552",
  verifiedOutline: "#2F7A5A",
  noneFg: "#5BE0AE",
  noneBg: "#103529",
  lowFg: "#A3B0FF",
  lowBg: "#1F2549",
  cautionFg: "#FFB869",
  cautionBg: "#3B2A12",
  highFg: "#FF8AA3",
  highBg: "#3F1623",
};

/** Plain-string palettes, for the few places that can't take a dynamic color. */
export const palettes = { light, dark } as const;

const dyn = (key: keyof typeof light) => DynamicColorIOS({ light: light[key], dark: dark[key] }) as NativeColorValue;

export const colors = {
  // Surfaces
  bg: dyn("bg"),
  card: dyn("card"),
  separator: dyn("separator"),
  pressed: dyn("pressed"),
  // Text
  ink: dyn("ink"),
  muted: dyn("muted"),
  placeholder: dyn("placeholder"),
  chevron: dyn("chevron"),
  white: "#FFFFFF", // text and icons on the brand gradient (same in light and dark)
  // Brand
  blue: dyn("blue"),
  violet: dyn("violet"),
  blueSoft: dyn("blueSoft"),
  violetSoft: dyn("violetSoft"),
  gradient: ["#5B7CFF", "#7B5CFF"] as const, // brand gradient (header, primary button, selected tile)
  onGradientMuted: "rgba(255,255,255,0.82)",
  verifiedOutline: dyn("verifiedOutline"),
  ringHigh: ["#FF7A9A", "#C21640"] as const, // dial gradient when risky emails were found
  ringNone: ["#4CD7A4", "#0B7A55"] as const, // dial gradient when none were found
  // Feature tiles (vivid icon backgrounds; work on light and dark)
  tile: { gmail: "#FF7A45", web: "#19B07B", texts: "#7B5CFF", settings: "#6B7090" },
  risk: {
    none: { fg: dyn("noneFg"), bg: dyn("noneBg"), label: "No red flags" },
    low: { fg: dyn("lowFg"), bg: dyn("lowBg"), label: "Small signs" },
    caution: { fg: dyn("cautionFg"), bg: dyn("cautionBg"), label: "Be careful" },
    high: { fg: dyn("highFg"), bg: dyn("highBg"), label: "High risk" },
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
