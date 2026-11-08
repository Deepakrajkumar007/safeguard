import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { SettingsProvider } from "@/settings";
import { palettes } from "@/theme";

// Show LinkGuard's alerts as a banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Tapping a LinkGuard notification opens the screen it's about (e.g. a text warning opens Text Alerts).
const SCREENS = new Set(["/alerts", "/gmail"]);
function openFromNotification(n: Notifications.Notification | undefined) {
  const url = n?.request.content.data?.url;
  if (typeof url === "string" && SCREENS.has(url)) router.push(url as "/alerts" | "/gmail");
}

// Native iPhone navigation: real title bar, Back button, and swipe-back. Home draws its own gradient header.
export default function RootLayout() {
  const p = palettes[useColorScheme() === "dark" ? "dark" : "light"]; // title bars need plain colors
  useEffect(() => {
    // App opened by tapping a notification, then any taps while it's running.
    openFromNotification(Notifications.getLastNotificationResponse()?.notification);
    const sub = Notifications.addNotificationResponseReceivedListener((r) => openFromNotification(r.notification));
    return () => sub.remove();
  }, []);

  return (
    <SettingsProvider>
      <Stack
        screenOptions={{
          headerTintColor: p.blue,
          headerTitleStyle: { color: p.ink },
          headerBackTitle: "Back",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: p.bg },
          contentStyle: { backgroundColor: p.bg },
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
