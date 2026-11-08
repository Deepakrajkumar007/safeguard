import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Text, type TextProps, type TextStyle } from "react-native";
import { colors, type, type TypeVariant } from "./theme";

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
 * App text. Always uses a step of the type ramp (theme.type), never a raw size.
 * Sizes scale with the "Larger text" switch, on top of the iPhone's own text-size setting
 * (React Native respects Dynamic Type by default).
 */
export function T({
  variant = "body",
  weight,
  color = colors.ink,
  style,
  ...rest
}: TextProps & { variant?: TypeVariant; weight?: TextStyle["fontWeight"]; color?: string }) {
  const { scale } = useSettings();
  const base = type[variant];
  const fontSize = Math.round(base.fontSize * scale);
  return (
    <Text
      {...rest}
      style={[{ ...base, fontSize, lineHeight: Math.round(fontSize * 1.3), color }, weight ? { fontWeight: weight } : null, style]}
    />
  );
}
