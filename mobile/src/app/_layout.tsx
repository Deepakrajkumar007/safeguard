import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SettingsProvider } from "@/settings";
import { colors } from "@/theme";

// Show LinkGuard's alerts as a banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Native iPhone navigation: real title bar, Back button, and swipe-back on every screen.
export default function RootLayout() {
  return (
    <SettingsProvider>
      <StatusBar style="dark" />
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
        <Stack.Screen name="index" options={{ title: "LinkGuard", headerLargeTitle: true }} />
        <Stack.Screen name="gmail" options={{ title: "Scan My Gmail" }} />
        <Stack.Screen name="open" options={{ title: "Open a Website" }} />
        <Stack.Screen name="alerts" options={{ title: "Text Alerts" }} />
      </Stack>
    </SettingsProvider>
  );
}
