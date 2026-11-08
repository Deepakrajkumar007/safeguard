import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { SettingsProvider } from "@/settings";
import { colors } from "@/theme";
import { loadTrusted, syncTrustedToShortcuts } from "@/trusted-store";

// Show LinkGuard's alerts as a banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Native iPhone navigation: real title bar, Back button, and swipe-back. Home draws its own gradient header.
export default function RootLayout() {
  useEffect(() => {
    // Keep the Shortcuts action's trusted list in step with the keychain copy (e.g. after a reinstall).
    void loadTrusted().then(syncTrustedToShortcuts);
  }, []);

  return (
    <SettingsProvider>
      <Stack
        screenOptions={{
          headerTintColor: colors.blue,
          headerTitleStyle: { color: colors.ink },
          headerBackTitle: "Back",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.bg },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: "LinkGuard", headerShown: false }} />
        <Stack.Screen name="gmail" options={{ title: "Scan My Gmail" }} />
        <Stack.Screen name="open" options={{ title: "Open a Website" }} />
        <Stack.Screen name="alerts" options={{ title: "Text Alerts" }} />
      </Stack>
    </SettingsProvider>
  );
}
