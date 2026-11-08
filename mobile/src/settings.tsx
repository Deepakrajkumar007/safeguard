import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance, Text, type ColorValue, type TextProps, type TextStyle } from "react-native";
import { colors, type, type TypeVariant } from "./theme";

interface Settings {
  largeText: boolean;
  setLargeText: (v: boolean) => void;
  /** The "Dark mode" switch. Read the current look with useColorScheme(). */
  setDarkMode: (on: boolean) => void;
  scale: number;
}

const SettingsContext = createContext<Settings>({
  largeText: false,
  setLargeText: () => {},
  setDarkMode: () => {},
  scale: 1,
});

const APPEARANCE_KEY = "lg.appearance";

// Light/Dark starts out matching the iPhone (app.json userInterfaceStyle "automatic"; colors are dynamic).
// Once the person flips the Dark mode switch, that choice is remembered and used from then on.
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [largeText, setLargeText] = useState(false);

  useEffect(() => {
    void SecureStore.getItemAsync(APPEARANCE_KEY)
      .then((v) => {
        if (v === "light" || v === "dark") Appearance.setColorScheme(v);
      })
      .catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      largeText,
      setLargeText,
      setDarkMode: (on: boolean) => {
        const v = on ? "dark" : "light";
        Appearance.setColorScheme(v);
        void SecureStore.setItemAsync(APPEARANCE_KEY, v).catch(() => {});
      },
      scale: largeText ? 1.25 : 1,
    }),
    [largeText],
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
}: TextProps & { variant?: TypeVariant; weight?: TextStyle["fontWeight"]; color?: ColorValue }) {
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
