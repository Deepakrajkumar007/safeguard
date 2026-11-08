import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Button, Notice } from "@/components/Button";
import { Card, Chip, Ring } from "@/components/Dashboard";
import { Row, Section } from "@/components/List";
import {
  cleanSkipEntry,
  endingTypoHint,
  getSession,
  loadSkipList,
  notifyFlagged,
  saveSkipList,
  scan,
  signIn,
  signOut,
  type EmailVerdict,
  type ScanResult,
  withoutSkipped,
} from "@/gmail";
import { T, useSettings } from "@/settings";
import { loadLastScan, saveLastScan, timeAgo, type LastScan } from "@/stats-store";
import { useKeyboardScroll } from "@/use-keyboard-scroll";
import { colors, radius, spacing, type } from "@/theme";

export default function GmailScreen() {
  const { scale } = useSettings();
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState<null | "signin" | "scan">(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const { scrollRef, inputRef, onScroll } = useKeyboardScroll();
  const [skip, setSkip] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  // The saved sender being fixed in the box. It stays saved until Save is tapped, so leaving loses nothing.
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [last, setLast] = useState<LastScan | null>(null);

  useEffect(() => {
    void (async () => {
      setSignedIn(Boolean(await getSession()));
      setSkip(await loadSkipList());
      setLast(await loadLastScan());
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
      const data = { ...r.data, flagged: withoutSkipped(r.data.flagged, list) };
      setResult(data);
      const summary = { scanned: data.scanned, flagged: data.flagged.length, verified: r.data.verifiedCount, at: Date.now() };
      setLast(summary);
      void saveLastScan(summary);
      await notifyFlagged(data.flagged.length);
    },
    [],
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
      const hint = endingTypoHint(draft);
      setDraftError(
        hint
          ? `Check the spelling: did you mean ${hint} at the end?`
          : "Enter an email (boss@work.com) or a whole company (@work.com), spelled exactly.",
      );
      return;
    }
    const next = [...new Set([...skip.filter((s) => s !== editing), entry])].slice(0, 25);
    setSkip(next);
    setEditing(null);
    // Hide that sender's emails from the results on screen right away (no rescan needed).
    setResult((r) => (r ? { ...r, flagged: withoutSkipped(r.flagged, next) } : r));
    setDraft("");
    setDraftError(null);
    await saveSkipList(next);
  };

  // Tap a saved sender to fix it: a copy goes into the box. The original is replaced only when you tap Save.
  const editSkip = (entry: string) => {
    setEditing(entry);
    setDraft(entry);
    setDraftError(null);
    inputRef.current?.focus();
  };

  const removeSkip = async (entry: string) => {
    if (editing === entry) setEditing(null);
    const next = skip.filter((s) => s !== entry);
    setSkip(next);
    await saveSkipList(next);
  };

  return (
    <ScrollView
      ref={scrollRef}
      automaticallyAdjustKeyboardInsets
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg }}
    >
      <StatusBar style="auto" />
      <Card>
        <View style={{ gap: spacing.md, paddingVertical: spacing.sm }}>
          {(() => {
            const scanned = result?.scanned ?? last?.scanned ?? 0;
            const flagged = result ? result.flagged.length : (last?.flagged ?? 0);
            const has = Boolean(result || last);
            return (
              <Ring progress={has && scanned ? Math.max(0.04, flagged / scanned) : 0} tone={has ? (flagged ? "high" : "none") : "brand"}>
                {has ? (
                  <>
                    <T variant="largeTitle" color={flagged ? colors.risk.high.fg : colors.risk.none.fg}>
                      {flagged}
                    </T>
                    <T variant="subhead" color={colors.muted} style={{ textAlign: "center" }}>
                      {flagged === 1 ? "risky email" : "risky emails"}
                    </T>
                    <T variant="footnote" color={colors.muted} style={{ textAlign: "center" }}>
                      of {scanned} checked
                    </T>
                  </>
                ) : (
                  <>
                    <Ionicons name="mail" size={36} color={colors.violet} />
                    <T variant="subhead" color={colors.muted} style={{ textAlign: "center" }}>
                      Not scanned yet
                    </T>
                  </>
                )}
              </Ring>
            );
          })()}
          <T variant="footnote" color={colors.muted} style={{ textAlign: "center" }}>
            {result || last
              ? `Last 24 hours · ${(result?.verifiedCount ?? last?.verified) || 0} from verified senders · scanned ${last ? timeAgo(last.at) : "just now"}`
              : "SafeGuard checks your recent emails for scams and shows which ones to be careful with."}
          </T>
        </View>
      </Card>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Chip icon="time" label="24 hours only" active />
        <Chip icon="eye-off" label="Skips senders" active />
        <Chip icon="hardware-chip" label="Rules, not AI" active />
        <Chip icon="timer" label="1-hour access" active />
      </View>

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
          {result.flagged.length > 0 ? (
            <Section title="Risky emails" footer="Don't click links or open attachments in these. In Gmail, open the email, tap ⋮, then Report phishing.">
              {result.flagged.map((v) => (
                <FlaggedRow key={v.id} v={v} open={open === v.id} onToggle={() => setOpen(open === v.id ? null : v.id)} />
              ))}
            </Section>
          ) : (
            <T variant="footnote" color={colors.muted} style={{ marginHorizontal: spacing.xs }}>
              That isn&apos;t a guarantee, so keep being careful with links.
            </T>
          )}
        </>
      )}

      <Section
        title="Never scan these senders"
        footer="Emails from these senders are never downloaded or read by SafeGuard. Use an address (boss@work.com) or a whole company (@work.com)."
      >
        {skip.map((s) => (
          <Row
            key={s}
            title={s}
            // Older entries were saved before spelling checks: point out any that can never match.
            subtitle={
              editing === s
                ? "Editing below. Tap Save when done."
                : cleanSkipEntry(s)
                  ? "Tap to edit"
                  : `Check the spelling${endingTypoHint(s) ? ` (${endingTypoHint(s)}?)` : ""}. Tap to fix it.`
            }
            onPress={() => editSkip(s)}
            accessibilityLabel={`${s}. Tap to edit.`}
            right={
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${s}`} hitSlop={10} onPress={() => removeSkip(s)}>
                <Ionicons name="remove-circle" size={24} color={colors.risk.high.fg} />
              </Pressable>
            }
          />
        ))}
        <View style={styles.addRow}>
          <TextInput
            ref={inputRef}
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
              {editing ? "Save" : "Add"}
            </T>
          </Pressable>
        </View>
      </Section>
      {draftError && (
        <T variant="footnote" weight="600" color={colors.risk.high.fg} style={{ marginHorizontal: spacing.md, marginTop: -spacing.md }}>
          {draftError}
        </T>
      )}

      <T variant="footnote" color={colors.muted} style={{ marginHorizontal: spacing.xs }}>
        Google asks SafeGuard for permission to read your email. SafeGuard&apos;s own code limits itself to the last 24 hours and
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
