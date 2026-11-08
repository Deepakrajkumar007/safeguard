"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EXAMPLES } from "@/lib/examples";
import { reportToSpeech, speak, stopSpeaking } from "@/lib/speech";
import type { CheckReport } from "@/lib/types";
import { ExplainCard, explanationToSpeech, type ExplainState } from "./ExplainCard";
import { ImageIcon } from "./icons";
import { LinksCard, NextStepsCard, VerdictCard } from "./Verdict";

type Speaking = "verdict" | "explain" | null;

export function CheckTab({ autoRead, initialText }: { autoRead: boolean; initialText?: string }) {
  const [text, setText] = useState(initialText ?? "");
  const [report, setReport] = useState<CheckReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readingImage, setReadingImage] = useState(false);
  const [fromScreenshot, setFromScreenshot] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [speaking, setSpeaking] = useState<Speaking>(null);
  const [explain, setExplain] = useState<ExplainState>({ status: "idle" });
  const resultRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  // Ask the AI (Gemini) to explain the verdict. Runs after the instant checker result, never blocks it.
  const fetchExplanation = useCallback(async (value: string, id: number) => {
    setExplain({ status: "loading" });
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      const data = await res.json();
      if (id !== requestId.current) return; // a newer check started; drop this answer
      if (!res.ok) setExplain({ status: "error", message: data.error ?? "The AI explanation isn't available right now." });
      else setExplain({ status: "done", data });
    } catch {
      if (id === requestId.current) {
        setExplain({ status: "error", message: "Couldn't reach the AI. The checker's result above still applies." });
      }
    }
  }, []);

  const runCheck = useCallback(
    async (value: string, opts: { speakResult: boolean }) => {
      if (!value.trim()) {
        setError("Paste a text message or link first.");
        return;
      }
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      setExplain({ status: "idle" });
      stopSpeaking();
      setSpeaking(null);
      try {
        const res = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: value }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
        setReport(data as CheckReport);
        void fetchExplanation(value, id);
        if (window.innerWidth < 1024) {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        if (opts.speakResult) {
          setSpeaking("verdict");
          speak(reportToSpeech(data as CheckReport), () => setSpeaking(null));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [fetchExplanation],
  );

  // Screenshot upload: AI transcribes the image, then the deterministic checker scores the text.
  const runScreenshot = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Please choose a picture (a screenshot of the message).");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("That image is too big. Use a screenshot under 5 MB.");
        return;
      }
      const id = ++requestId.current;
      setReadingImage(true);
      setError(null);
      setExplain({ status: "idle" });
      stopSpeaking();
      setSpeaking(null);
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Couldn't open that file."));
          reader.readAsDataURL(file);
        });
        const res = await fetch("/api/screenshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl }),
        });
        const data = await res.json();
        if (id !== requestId.current) return;
        if (!res.ok) throw new Error(data.error ?? "Couldn't read that screenshot. Try pasting the text instead.");
        setText(data.text);
        setFromScreenshot(true);
        setReport(data.report as CheckReport);
        void fetchExplanation(data.text, id);
        if (autoRead) {
          setSpeaking("verdict");
          speak(reportToSpeech(data.report as CheckReport), () => setSpeaking(null));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't read that screenshot. Try pasting the text instead.");
      } finally {
        setReadingImage(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [autoRead, fetchExplanation],
  );

  // A link handed over from the Open a site tab: check it right away.
  useEffect(() => {
    if (!initialText) return;
    const t = setTimeout(() => void runCheck(initialText, { speakResult: autoRead }), 0);
    return () => clearTimeout(t);
    // Run once for the handed-over text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep link for demos and screenshots: /?example=bank
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("example");
    const ex = EXAMPLES.find((e) => e.id === id);
    if (!ex) return;
    const t = setTimeout(() => {
      setText(ex.text);
      void runCheck(ex.text, { speakResult: false });
    }, 0);
    return () => clearTimeout(t);
  }, [runCheck]);

  const toggleSpeak = (what: "verdict" | "explain") => {
    if (speaking === what) {
      stopSpeaking();
      setSpeaking(null);
      return;
    }
    const words =
      what === "verdict"
        ? report && reportToSpeech(report)
        : explain.status === "done" && explanationToSpeech(explain.data);
    if (!words) return;
    setSpeaking(what);
    speak(words, () => setSpeaking(null));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="space-y-6">
        <section className="hero-gradient overflow-hidden rounded-card p-7 text-white shadow-[0_30px_60px_-30px_rgba(36,21,95,0.8)] sm:p-8">
          <p className="text-white/75">Not sure about a message?</p>
          <h1 className="mt-1 text-[2rem] font-extrabold leading-tight tracking-tight sm:text-[2.3rem]">
            Check a text or link before you tap.
          </h1>

          <form
            className="mt-6"
            onSubmit={(e) => {
              e.preventDefault();
              void runCheck(text, { speakResult: autoRead });
            }}
          >
            <label htmlFor="message" className="text-sm font-semibold tracking-[0.12em] text-white/80">
              PASTE THE MESSAGE OR LINK
            </label>
            <textarea
              id="message"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setFromScreenshot(false);
              }}
              rows={6}
              maxLength={5000}
              placeholder="For example: Your account has been locked. Verify now at…"
              className="mt-2 w-full resize-y rounded-2xl border-0 bg-white p-4 text-lg leading-relaxed text-ink shadow-inner placeholder:text-slate-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
            />

            {fromScreenshot && (
              <p className="mt-2 text-sm text-white/80">
                Read from your screenshot by AI (Google Gemini). Make sure the text above matches the picture.
              </p>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void runScreenshot(f);
              }}
            />
            <button
              type="button"
              disabled={readingImage}
              onClick={() => fileRef.current?.click()}
              className="glass mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-lg font-semibold text-white hover:bg-white/25 disabled:opacity-70"
            >
              <ImageIcon className="h-5 w-5" />
              {readingImage ? "Reading your screenshot…" : "Upload a screenshot instead"}
            </button>

            <div className="mt-4">
              <p className="text-sm text-white/75">Or try an example:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      setText(ex.text);
                      setFromScreenshot(false);
                      void runCheck(ex.text, { speakResult: autoRead });
                    }}
                    className="glass rounded-full px-4 py-2 text-[0.95rem] font-medium text-white hover:bg-white/25"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-white px-6 py-4 text-xl font-bold text-ink shadow-lg transition hover:bg-blue-50 disabled:opacity-70"
            >
              {loading ? "Checking…" : "Check this message"}
            </button>
            {text && (
              <button
                type="button"
                onClick={() => {
                  setText("");
                  setFromScreenshot(false);
                  setReport(null);
                  setError(null);
                  setExplain({ status: "idle" });
                  requestId.current++;
                  stopSpeaking();
                  setSpeaking(null);
                }}
                className="mt-3 w-full rounded-2xl px-6 py-2 text-base font-medium text-white/80 hover:text-white"
              >
                Clear
              </button>
            )}
            {error && (
              <p role="alert" className="mt-4 rounded-2xl bg-white/15 p-4 text-lg font-semibold">
                {error}
              </p>
            )}
          </form>
        </section>

        {report && (
          <div className="hidden lg:block">
            <LinksCard report={report} />
          </div>
        )}
      </div>

      <div ref={resultRef} className="space-y-6">
        <VerdictCard report={report} speaking={speaking === "verdict"} onSpeak={() => toggleSpeak("verdict")} />
        <ExplainCard state={explain} speaking={speaking === "explain"} onSpeak={() => toggleSpeak("explain")} />
        {report && <NextStepsCard report={report} />}
        {report && (
          <div className="lg:hidden">
            <LinksCard report={report} />
          </div>
        )}
      </div>
    </div>
  );
}
