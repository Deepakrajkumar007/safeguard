"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EXAMPLES } from "@/lib/examples";
import { reportToSpeech, speak, stopSpeaking } from "@/lib/speech";
import type { CheckReport } from "@/lib/types";
import { LinksCard, NextStepsCard, VerdictCard } from "./Verdict";

export function CheckTab({ autoRead }: { autoRead: boolean }) {
  const [text, setText] = useState("");
  const [report, setReport] = useState<CheckReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const runCheck = useCallback(
    async (value: string, opts: { speakResult: boolean }) => {
      if (!value.trim()) {
        setError("Paste a text message or link first.");
        return;
      }
      setLoading(true);
      setError(null);
      stopSpeaking();
      setSpeaking(false);
      try {
        const res = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: value }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
        setReport(data as CheckReport);
        if (window.innerWidth < 1024) {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        if (opts.speakResult) {
          setSpeaking(true);
          speak(reportToSpeech(data as CheckReport), () => setSpeaking(false));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

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

  const toggleSpeak = () => {
    if (!report) return;
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      speak(reportToSpeech(report), () => setSpeaking(false));
    }
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
              onChange={(e) => setText(e.target.value)}
              rows={6}
              maxLength={5000}
              placeholder="For example: Your account has been locked. Verify now at…"
              className="mt-2 w-full resize-y rounded-2xl border-0 bg-white p-4 text-lg leading-relaxed text-ink shadow-inner placeholder:text-slate-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
            />

            <div className="mt-4">
              <p className="text-sm text-white/75">Or try an example:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      setText(ex.text);
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
                  setReport(null);
                  setError(null);
                  stopSpeaking();
                  setSpeaking(false);
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
        <VerdictCard report={report} speaking={speaking} onSpeak={toggleSpeak} />
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
