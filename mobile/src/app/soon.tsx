import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { T } from "@/settings";
import { colors, radius } from "@/theme";

// Placeholder for screens that aren't built yet.
export default function Soon() {
  const router = useRouter();
  const { title } = useLocalSearchParams<{ title?: string }>();
  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ padding: 6, alignSelf: "flex-start" }}>
        <Ionicons name="arrow-back" size={28} color={colors.ink} />
      </Pressable>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.blueSoft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="construct-outline" size={36} color={colors.blue} />
        </View>
        <T size={24} weight="800" style={{ textAlign: "center" }}>
          {title ?? "Coming soon"}
        </T>
        <T size={17} color={colors.muted} style={{ textAlign: "center" }}>
          This screen is being built next.
        </T>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12, backgroundColor: colors.ink, borderRadius: radius.row, paddingHorizontal: 28, paddingVertical: 14 }}>
          <T size={17} weight="800" color={colors.white}>
            Go back
          </T>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
