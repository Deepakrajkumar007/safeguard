import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { T } from "@/settings";
import { colors } from "@/theme";

/** Back arrow, centered title, optional right-side action (like the reference's Results header). */
export function ScreenHeader({ title, right, light = false }: { title: string; right?: ReactNode; light?: boolean }) {
  const router = useRouter();
  const fg = light ? colors.white : colors.ink;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={12}
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        style={{ width: 44, height: 44, justifyContent: "center" }}
      >
        <Ionicons name="arrow-back" size={28} color={fg} />
      </Pressable>
      <T size={20} weight="700" color={fg} accessibilityRole="header">
        {title}
      </T>
      <View style={{ width: 44, height: 44, alignItems: "flex-end", justifyContent: "center" }}>{right}</View>
    </View>
  );
}
