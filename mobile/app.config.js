// Extends app.json. Puts the server address and app key into Info.plist at build time so the native
// "Check Message with SafeGuard" Shortcuts action can reach the server. Values come from
// mobile/.env.local (git-ignored), so the key never lands in the repo.
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    infoPlist: {
      ...(config.ios?.infoPlist ?? {}),
      // The name people see under the app icon and in Shortcuts. (expo.name in app.json stays "LinkGuard"
      // because the Xcode project and target are named after it.)
      CFBundleDisplayName: "SafeGuard",
      LinkGuardAPIBase: process.env.EXPO_PUBLIC_API_URL ?? "",
      LinkGuardAppKey: process.env.EXPO_PUBLIC_LINKGUARD_KEY ?? "",
    },
  },
});
