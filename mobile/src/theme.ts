// Blue-and-white theme. Brand blue is for actions and chrome only.
// Risk always uses its own colors (green / amber / red) so "danger" never looks like the brand.
export const colors = {
  bg: "#F4F7FD",
  card: "#FFFFFF",
  ink: "#0B1533",
  muted: "#5B6478",
  line: "#E4E9F4",
  blue: "#1E5EFF",
  blueDark: "#1546C8",
  blueSoft: "#DCE7FF",
  lilac: "#E7E1FF",
  mint: "#D5F5E6",
  sky: "#D4EEFF",
  white: "#FFFFFF",
  risk: {
    none: { fg: "#0B7A55", bg: "#D5F5E6", label: "No red flags" },
    low: { fg: "#1546C8", bg: "#DCE7FF", label: "Small signs" },
    caution: { fg: "#9A4A00", bg: "#FFEBCC", label: "Be careful" },
    high: { fg: "#C21640", bg: "#FFE0E6", label: "High risk" },
  },
} as const;

export const radius = { card: 28, row: 20, pill: 999 } as const;
