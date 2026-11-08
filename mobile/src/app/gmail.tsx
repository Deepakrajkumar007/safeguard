import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
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
import { colors, radius } from "@/theme";

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
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <ScreenHeader title="Scan my Gmail" />

          {/* Hero: what it does and its limits */}
          <View style={styles.hero}>
            <T size={22} weight="800" color={colors.white}>
              Check your Gmail for scam emails
            </T>
            <View style={styles.promises}>
              {(
                [
                  ["time-outline", "Only the last 24 hours"],
                  ["eye-off-outline", "Skips senders you choose"],
                  ["hardware-chip-outline", "Checked by rules, not AI"],
                  ["timer-outline", "Access ends within 1 hour"],
                ] as const
              ).map(([icon, label]) => (
                <View key={label} style={styles.promise}>
                  <Ionicons name={icon} size={16} color={colors.white} />
                  <T size={14} weight="700" color={colors.white}>
                    {label}
                  </T>
                </View>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={busy !== null}
              onPress={() => (signedIn ? runScan(skip) : onSignIn())}
              style={({ pressed }) => [styles.heroBtn, (pressed || busy) && { opacity: 0.8 }]}
            >
              {busy ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <Ionicons name={signedIn ? "refresh" : "logo-google"} size={20} color={colors.ink} />
              )}
              <T size={19} weight="800">
                {busy === "signin" ? "Signing in…" : busy === "scan" ? "Scanning…" : signedIn ? "Scan last 24 hours" : "Sign in with Google"}
              </T>
            </Pressable>
            {signedIn && (
              <View style={styles.accountRow}>
                <T size={13} color="rgba(255,255,255,0.85)" style={{ flex: 1 }}>
                  {result?.account ? `Signed in as ${result.account}` : "Signed in"}
                </T>
                <Pressable
                  accessibilityRole="button"
                  onPress={async () => {
                    await signOut();
                    setSignedIn(false);
                    setResult(null);
                  }}
                  hitSlop={8}
                >
                  <T size={13} weight="800" color={colors.white} style={{ textDecorationLine: "underline" }}>
                    Sign out
                  </T>
                </Pressable>
              </View>
            )}
          </View>

          {error && (
            <View style={[styles.notice, { backgroundColor: colors.risk.caution.bg }]}>
              <Ionicons name="alert-circle" size={20} color={colors.risk.caution.fg} />
              <T size={16} weight="700" color={colors.risk.caution.fg} style={{ flex: 1 }}>
                {error}
              </T>
            </View>
          )}

          {/* Results */}
          {result && (
            <>
              <View style={styles.tiles}>
                <Tile big={`${result.scanned}`} small="Emails checked" bg={colors.sky} icon="mail-outline" />
                <Tile
                  big={`${result.flagged.length}`}
                  small={result.flagged.length === 1 ? "Risky email" : "Risky emails"}
                  bg={result.flagged.length ? colors.risk.high.bg : colors.risk.none.bg}
                  icon="warning-outline"
                />
                <Tile big={`${result.verifiedCount}`} small="Verified senders" bg={colors.mint} icon="checkmark-done-outline" />
              </View>

              {result.flagged.length === 0 ? (
                <View style={[styles.notice, { backgroundColor: colors.risk.none.bg }]}>
                  <Ionicons name="shield-checkmark" size={22} color={colors.risk.none.fg} />
                  <T size={16} weight="700" color={colors.risk.none.fg} style={{ flex: 1 }}>
                    No red flags found in {result.scanned} emails from the last 24 hours. That isn&apos;t a guarantee, so keep
                    being careful with links.
                  </T>
                </View>
              ) : (
                <>
                  <T size={21} weight="800" style={{ marginTop: 22, marginBottom: 10 }} accessibilityRole="header">
                    Risky emails
                  </T>
                  <View style={styles.list}>
                    {result.flagged.map((v, i) => (
                      <FlaggedRow key={v.id} v={v} rank={i + 1} open={open === v.id} onToggle={() => setOpen(open === v.id ? null : v.id)} />
                    ))}
                  </View>
                </>
              )}
              {result.skippedSenders.length > 0 && (
                <T size={13} color={colors.muted} style={{ marginTop: 10 }}>
                  Not opened: emails from {result.skippedSenders.join(", ")}.
                </T>
              )}
            </>
          )}

          {/* Never-scan list */}
          <View style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="eye-off" size={22} color={colors.blue} />
              <T size={20} weight="800" accessibilityRole="header">
                Never scan these senders
              </T>
            </View>
            <T size={15} color={colors.muted}>
              Emails from these senders are never downloaded or read by LinkGuard. Use an address (boss@work.com) or a whole
              company (@work.com).
            </T>
            {skip.length > 0 && (
              <View style={styles.chips}>
                {skip.map((s) => (
                  <View key={s} style={styles.chip}>
                    <T size={14} weight="700">
                      {s}
                    </T>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${s}`} hitSlop={8} onPress={() => removeSkip(s)}>
                      <Ionicons name="close-circle" size={18} color={colors.muted} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.addRow}>
              <TextInput
                value={draft}
                onChangeText={(v) => {
                  setDraft(v);
                  setDraftError(null);
                }}
                onSubmitEditing={addSkip}
                placeholder="boss@work.com or @work.com"
                placeholderTextColor="#8A93A8"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="done"
                accessibilityLabel="Sender to never scan"
                style={[styles.addInput, { fontSize: Math.round(17 * scale) }]}
              />
              <Pressable accessibilityRole="button" onPress={addSkip} style={styles.addBtn}>
                <T size={16} weight="800" color={colors.white}>
                  Add
                </T>
              </Pressable>
            </View>
            {draftError && (
              <T size={14} weight="700" color={colors.risk.high.fg}>
                {draftError}
              </T>
            )}
          </View>

          <T size={13} color={colors.muted} style={{ marginTop: 16, textAlign: "center" }}>
            Google asks LinkGuard for permission to read your email. LinkGuard&apos;s own code limits itself to the last 24 hours
            and skips your never-scan list. Email contents are checked in memory and never saved.
          </T>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Tile({ big, small, bg, icon }: { big: string; small: string; bg: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 22, padding: 14, gap: 6, minHeight: 104 }}>
      <Ionicons name={icon} size={22} color={colors.ink} />
      <T size={22} weight="800">
        {big}
      </T>
      <T size={13} color={colors.muted}>
        {small}
      </T>
    </View>
  );
}

function FlaggedRow({ v, rank, open, onToggle }: { v: EmailVerdict; rank: number; open: boolean; onToggle: () => void }) {
  const c = v.level === "high" ? colors.risk.high : colors.risk.caution;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={styles.row}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <T size={18} weight="800" color={colors.muted} style={{ width: 26 }}>
          {String(rank).padStart(2, "0")}
        </T>
        <View style={{ flex: 1 }}>
          <T size={16} weight="800" color={c.fg} numberOfLines={1}>
            {v.from.replace(/<[^>]*>/g, "").replace(/"/g, "").trim() || v.from}
          </T>
          <T size={15} numberOfLines={open ? undefined : 1}>
            {v.subject || "(no subject)"}
          </T>
          {v.scamType && (
            <T size={13} color={colors.muted}>
              {v.scamType}
            </T>
          )}
        </View>
        <View style={{ backgroundColor: c.bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
          <T size={13} weight="800" color={c.fg}>
            {v.score}
          </T>
        </View>
      </View>
      {open && (
        <View style={{ marginTop: 12, marginLeft: 38, gap: 8 }}>
          {v.reasons.map((r, i) => (
            <View key={i}>
              <T size={15} weight="700">
                {r.title}
              </T>
              <T size={14} color={colors.muted}>
                {r.detail}
              </T>
            </View>
          ))}
          <View style={{ backgroundColor: colors.bg, borderRadius: 14, padding: 12 }}>
            <T size={14} weight="700">
              Don&apos;t click links or open attachments in this email. In Gmail, open it, tap ⋮, then Report phishing.
            </T>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 48 },
  hero: { marginTop: 8, backgroundColor: colors.blue, borderRadius: radius.card, padding: 20, gap: 14 },
  promises: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  promise: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroBtn: {
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  accountRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  notice: { marginTop: 16, borderRadius: radius.row, padding: 16, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  tiles: { flexDirection: "row", gap: 10, marginTop: 18 },
  list: { backgroundColor: colors.card, borderRadius: radius.card, paddingHorizontal: 14 },
  row: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  card: { marginTop: 22, backgroundColor: colors.card, borderRadius: radius.card, padding: 18, gap: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.blueSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addRow: { flexDirection: "row", gap: 10 },
  addInput: { flex: 1, backgroundColor: colors.bg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: colors.ink },
  addBtn: { backgroundColor: colors.ink, borderRadius: 14, paddingHorizontal: 18, justifyContent: "center" },
});
