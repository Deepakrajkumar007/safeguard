import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Text, type TextProps, type TextStyle } from "react-native";
import { colors } from "./theme";

interface Settings {
  largeText: boolean;
  setLargeText: (v: boolean) => void;
  /** Read every result aloud automatically. On by default for older adults. */
  autoRead: boolean;
  setAutoRead: (v: boolean) => void;
  scale: number;
}

const SettingsContext = createContext<Settings>({
  largeText: false,
  setLargeText: () => {},
  autoRead: true,
  setAutoRead: () => {},
  scale: 1,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [largeText, setLargeText] = useState(false);
  const [autoRead, setAutoRead] = useState(true);
  const value = useMemo(
    () => ({ largeText, setLargeText, autoRead, setAutoRead, scale: largeText ? 1.25 : 1 }),
    [largeText, autoRead],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);

/**
 * App text. Sizes scale with the "Larger text" switch, on top of the iPhone's own text-size setting
 * (React Native respects Dynamic Type by default).
 */
export function T({
  size = 17,
  weight = "400",
  color = colors.ink,
  style,
  ...rest
}: TextProps & { size?: number; weight?: TextStyle["fontWeight"]; color?: string }) {
  const { scale } = useSettings();
  const fontSize = Math.round(size * scale);
  return <Text {...rest} style={[{ fontSize, fontWeight: weight, color, lineHeight: Math.round(fontSize * 1.3) }, style]} />;
}
