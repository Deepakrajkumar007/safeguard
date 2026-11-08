import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Button, Notice } from "@/components/Button";
import { IconTile, Row, Section } from "@/components/List";
import {
  cleanSkipEntry,
  getSession,
  loadSkipList,
  notifyFlagged,
  saveSkipList,
  scan,
  signIn,
  signOut,
  type EmailVerdict,
  type ScanResult,
} from "@/gmail";
import { T, useSettings } from "@/settings";
import { speak } from "@/speech";
import { colors, radius, spacing, type } from "@/theme";

export default function GmailScreen() {
  const { scale, autoRead } = useSettings();
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState<null | "signin" | "scan">(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [skip, setSkip] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setSignedIn(Boolean(await getSession()));
      setSkip(await loadSkipList());
    })();
  }, []);

  const runScan = useCallback(
    async (list: string[]) => {
      setBusy("scan");
      setError(null);
      const r = await scan(list);
      setBusy(null);
      if (!r.ok) {
        setError(r.message);
        if (r.expired) setSignedIn(false);
        return;
      }
      setResult(r.data);
      await notifyFlagged(r.data.flagged.length);
      if (autoRead) {
        const n = r.data.flagged.length;
        void speak(
          n === 0
            ? `No red flags found in ${r.data.scanned} emails from the last 24 hours.`
            : `Warning. ${n} risky ${n === 1 ? "email" : "emails"} found in the last 24 hours. Don't click links in ${n === 1 ? "it" : "them"}.`,
        );
      }
    },
    [autoRead],
  );

  const onSignIn = async () => {
    setBusy("signin");
    setError(null);
    const r = await signIn();
    setBusy(null);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setSignedIn(true);
    await runScan(skip);
  };

  const addSkip = async () => {
    const entry = cleanSkipEntry(draft);
    if (!entry) {
      setDraftError("Enter an email (boss@work.com) or a whole company (@work.com).");
      return;
    }
    const next = [...new Set([...skip, entry])].slice(0, 25);
    setSkip(next);
    setDraft("");
    setDraftError(null);
    await saveSkipList(next);
  };

  const removeSkip = async (entry: string) => {
    const next = skip.filter((s) => s !== entry);
    setSkip(next);
    await saveSkipList(next);
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg }}
    >
      <T variant="callout" color={colors.muted} style={{ marginHorizontal: spacing.xs }}>
        LinkGuard checks your recent emails for scams and shows which ones to be careful with.
      </T>

      <Section title="Your privacy">
        <Row left={<IconTile icon="time" color={colors.tile.web} />} title="Only the last 24 hours" />
        <Row left={<IconTile icon="eye-off" color={colors.tile.web} />} title="Skips senders you choose" />
        <Row left={<IconTile icon="hardware-chip" color={colors.tile.web} />} title="Checked by rules, not AI" />
        <Row left={<IconTile icon="timer" color={colors.tile.web} />} title="Access ends within 1 hour" />
      </Section>

      <View style={{ gap: spacing.smd }}>
        <Button
          title={busy === "signin" ? "Signing in…" : busy === "scan" ? "Scanning…" : signedIn ? "Scan last 24 hours" : "Sign in with Google"}
          icon={signedIn ? "refresh" : "logo-google"}
          loading={busy !== null}
          onPress={() => (signedIn ? runScan(skip) : onSignIn())}
        />
        {signedIn && (
          <View style={styles.accountRow}>
            <T variant="footnote" color={colors.muted} style={{ flex: 1 }}>
              {result?.account ? `Signed in as ${result.account}` : "Signed in"}
            </T>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={async () => {
                await signOut();
                setSignedIn(false);
                setResult(null);
              }}
            >
              <T variant="footnote" weight="600" color={colors.blue}>
                Sign out
              </T>
            </Pressable>
          </View>
        )}
      </View>

      {error && (
        <Notice tone="caution" icon="alert-circle">
          {error}
        </Notice>
      )}

      {result && (
        <>
          <Section>
            <Row
              left={<IconTile icon={result.flagged.length ? "warning" : "shield-checkmark"} color={result.flagged.length ? colors.risk.high.fg : colors.risk.none.fg} />}
              title={result.flagged.length ? `${result.flagged.length} risky ${result.flagged.length === 1 ? "email" : "emails"}` : "No red flags found"}
              subtitle={`${result.scanned} checked from the last 24 hours · ${result.verifiedCount} from verified senders`}
            />
          </Section>

          {result.flagged.length > 0 ? (
            <Section title="Risky emails" footer="Don't click links or open attachments in these. In Gmail, open the email, tap ⋮, then Report phishing.">
              {result.flagged.map((v) => (
                <FlaggedRow key={v.id} v={v} open={open === v.id} onToggle={() => setOpen(open === v.id ? null : v.id)} />
              ))}
            </Section>
          ) : (
            <T variant="footnote" color={colors.muted} style={{ marginHorizontal: spacing.md }}>
              That isn&apos;t a guarantee, so keep being careful with links.
            </T>
          )}
        </>
      )}

      <Section
        title="Never scan these senders"
        footer="Emails from these senders are never downloaded or read by LinkGuard. Use an address (boss@work.com) or a whole company (@work.com)."
      >
        {skip.map((s) => (
          <Row
            key={s}
            title={s}
            right={
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${s}`} hitSlop={10} onPress={() => removeSkip(s)}>
                <Ionicons name="remove-circle" size={24} color={colors.risk.high.fg} />
              </Pressable>
            }
          />
        ))}
        <View style={styles.addRow}>
          <TextInput
            value={draft}
            onChangeText={(v) => {
              setDraft(v);
              setDraftError(null);
            }}
            onSubmitEditing={addSkip}
            placeholder="boss@work.com or @work.com"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="done"
            accessibilityLabel="Sender to never scan"
            style={[styles.addInput, { fontSize: Math.round(type.body.fontSize * scale) }]}
          />
          <Pressable accessibilityRole="button" onPress={addSkip} hitSlop={8}>
            <T variant="headline" color={colors.blue}>
              Add
            </T>
          </Pressable>
        </View>
      </Section>
      {draftError && (
        <T variant="footnote" weight="600" color={colors.risk.high.fg} style={{ marginHorizontal: spacing.md, marginTop: -spacing.md }}>
          {draftError}
        </T>
      )}

      <T variant="footnote" color={colors.muted} style={{ marginHorizontal: spacing.md }}>
        Google asks LinkGuard for permission to read your email. LinkGuard&apos;s own code limits itself to the last 24 hours and
        skips your never-scan list. Email contents are checked in memory and never saved.
      </T>
    </ScrollView>
  );
}

function FlaggedRow({ v, open, onToggle }: { v: EmailVerdict; open: boolean; onToggle: () => void }) {
  const c = v.level === "high" ? colors.risk.high : colors.risk.caution;
  const from = v.from.replace(/<[^>]*>/g, "").replace(/"/g, "").trim() || v.from;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle}>
      {({ pressed }) => (
        <View style={[styles.flagged, pressed && { backgroundColor: colors.pressed }]}>
          <View style={{ flexDirection: "row", gap: spacing.smd, alignItems: "flex-start" }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="headline" color={c.fg} numberOfLines={1}>
                {from}
              </T>
              <T variant="subhead" numberOfLines={open ? undefined : 1}>
                {v.subject || "(no subject)"}
              </T>
              {v.scamType && (
                <T variant="footnote" color={colors.muted}>
                  {v.scamType}
                </T>
              )}
            </View>
            <View style={[styles.pill, { backgroundColor: c.bg }]}>
              <T variant="footnote" weight="700" color={c.fg}>
                {c.label}
              </T>
            </View>
          </View>
          {open && (
            <View style={{ marginTop: spacing.smd, gap: spacing.sm }}>
              {v.reasons.map((r, i) => (
                <View key={i}>
                  <T variant="subhead" weight="600">
                    {r.title}
                  </T>
                  <T variant="footnote" color={colors.muted}>
                    {r.detail}
                  </T>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  accountRow: { flexDirection: "row", alignItems: "center", gap: spacing.smd, marginHorizontal: spacing.xs },
  flagged: { paddingHorizontal: spacing.md, paddingVertical: spacing.smd },
  pill: { borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs },
  addRow: { flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, minHeight: 56 },
  addInput: { flex: 1, color: colors.ink, paddingVertical: spacing.smd },
});
