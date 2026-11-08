import { useRouter } from "expo-router";
import { ScrollView, Switch } from "react-native";
import { IconTile, Row, Section } from "@/components/List";
import { T, useSettings } from "@/settings";
import { colors, spacing } from "@/theme";

export default function Home() {
  const router = useRouter();
  const { largeText, setLargeText, autoRead, setAutoRead } = useSettings();

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg }}>
      <T variant="callout" color={colors.muted} style={{ marginHorizontal: spacing.xs }}>
        Protection from scam emails, fake websites, and scam texts.
      </T>

      <Section title="Protect me">
        <Row
          left={<IconTile icon="mail" color={colors.tile.gmail} />}
          title="Scan my Gmail"
          subtitle="Find scam emails from the last 24 hours"
          onPress={() => router.push("/gmail")}
        />
        <Row
          left={<IconTile icon="globe" color={colors.tile.web} />}
          title="Open a website safely"
          subtitle="Say a name, open the real site"
          onPress={() => router.push("/open")}
        />
        <Row
          left={<IconTile icon="chatbubbles" color={colors.tile.texts} />}
          title="Text message alerts"
          subtitle="Get warned about scam texts"
          onPress={() => router.push("/alerts")}
        />
      </Section>

      <Section
        title="Settings"
        footer={'LinkGuard never says a message is "safe". It only tells you whether it found warning signs.'}
      >
        <Row
          left={<IconTile icon="text" color={colors.tile.settings} />}
          title="Larger text"
          right={<Switch value={largeText} onValueChange={setLargeText} trackColor={{ true: colors.blue }} accessibilityLabel="Larger text" />}
        />
        <Row
          left={<IconTile icon="volume-high" color={colors.tile.settings} />}
          title="Read results aloud"
          right={<Switch value={autoRead} onValueChange={setAutoRead} trackColor={{ true: colors.blue }} accessibilityLabel="Read results aloud" />}
        />
      </Section>
    </ScrollView>
  );
}
