import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { runSelfTest } from "@/selftest";
import { T } from "@/settings";
import { colors, radius } from "@/theme";

export default function SelfTest() {
  const router = useRouter();
  const result = useMemo(() => runSelfTest(), []);
  const ok = result.failures.length === 0;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ padding: 6, alignSelf: "flex-start" }}>
          <Ionicons name="arrow-back" size={28} color={colors.ink} />
        </Pressable>
        <T size={26} weight="800">
          Checker self-test
        </T>
        <View
          style={{
            backgroundColor: ok ? colors.risk.none.bg : colors.risk.high.bg,
            borderRadius: radius.card,
            padding: 22,
          }}
        >
          <T size={44} weight="800" color={ok ? colors.risk.none.fg : colors.risk.high.fg}>
            {result.passed}/{result.total}
          </T>
          <T size={17} weight="700">
            {ok ? "All checks passed on this phone" : "Some checks failed on this phone"}
          </T>
          <T size={14} color={colors.muted} style={{ marginTop: 6 }}>
            Real brand links: no false alarms. Scam samples: caught as high risk. Ran in {result.ms} ms.
          </T>
        </View>
        {result.failures.map((f) => (
          <View key={f} style={{ backgroundColor: colors.card, borderRadius: radius.row, padding: 16 }}>
            <T size={15}>{f}</T>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
