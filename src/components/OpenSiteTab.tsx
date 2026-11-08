"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Brand } from "@/lib/brands";
import { matchSpoken, POPULAR, spokenAddress } from "@/lib/launcher";
import { speak } from "@/lib/speech";
import { CheckIcon, MicIcon, StopIcon } from "./icons";

// Minimal typing for the browser's speech recognition (Chrome exposes it as webkitSpeechRecognition).
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
}
type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Voice launcher (web). Speech only picks a brand NAME from the verified list; the address opened is always
 * that brand's fixed launchUrl. Speech is never turned into a web address.
 */
export function OpenSiteTab({ autoRead, onCheckLink }: { autoRead: boolean; onCheckLink: (text: string) => void }) {
  const [said, setSaid] = useState("");
  const [picked, setPicked] = useState<Brand | null>(null);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [hasMic, setHasMic] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    // Feature-detect after mount (the server can't know which browser this is).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMic(Boolean(getRecognition()));
    const site = new URLSearchParams(window.location.search).get("site");
    if (site) setSaid(site.slice(0, 100));
    return () => recRef.current?.stop();
  }, []);

  const match = useMemo(() => matchSpoken(said), [said]);
  const chosen = picked ?? match.brand;
  const options = said.trim() ? match.suggestions : POPULAR;

  const announce = (b: Brand) => {
    if (autoRead) speak(`${b.name}. The real website is ${spokenAddress(b.launchUrl)}.`);
  };

  const choose = (b: Brand) => {
    setPicked(b);
    announce(b);
  };

  const listen = () => {
    const Ctor = getRecognition();
    if (!Ctor) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ");
      setSaid(text);
      setPicked(null);
    };
    rec.onerror = (e) => {
      setMicError(e.error === "not-allowed" ? "Microphone access was blocked. Allow it in the browser, or type the name." : "Didn't catch that. Try again or type the name.");
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setMicError(null);
    setListening(true);
    rec.start();
  };

  // Read the match aloud once it settles after speaking.
  useEffect(() => {
    if (!listening && match.brand && !picked) announce(match.brand);
    // Only when listening stops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="hero-gradient overflow-hidden rounded-card p-7 text-white shadow-[0_30px_60px_-30px_rgba(36,21,95,0.8)] sm:p-8">
        <p className="text-white/75">Need to visit your bank or a store?</p>
        <h1 className="mt-1 text-[2rem] font-extrabold leading-tight tracking-tight sm:text-[2.3rem]">Say the name. We open the real site.</h1>

        <div className="mt-6 flex flex-col items-center gap-3">
          {hasMic ? (
            <button
              type="button"
              onClick={listen}
              aria-pressed={listening}
              className={`grid h-28 w-28 place-items-center rounded-full shadow-xl transition ${listening ? "bg-rose-500 animate-pulse" : "bg-white text-ink hover:bg-blue-50"}`}
            >
              {listening ? <StopIcon className="h-10 w-10 text-white" /> : <MicIcon className="h-11 w-11" />}
              <span className="sr-only">{listening ? "Stop listening" : "Start listening"}</span>
            </button>
          ) : null}
          <p className="text-lg font-semibold">
            {hasMic ? (listening ? "Listening… say a name like “Chase”" : "Tap the microphone and say a name") : "Type a name like “Chase”"}
          </p>
        </div>

        <label htmlFor="site" className="mt-6 block text-sm font-semibold tracking-[0.12em] text-white/80">
          OR TYPE IT
        </label>
        <input
          id="site"
          value={said}
          onChange={(e) => {
            setSaid(e.target.value);
            setPicked(null);
          }}
          placeholder="Chase, Medicare, Amazon…"
          autoComplete="off"
          className="mt-2 w-full rounded-2xl border-0 bg-white p-4 text-xl text-ink placeholder:text-slate-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
        />
        <p className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">
          We only open addresses from our verified list
        </p>
        {micError && <p className="mt-3 rounded-2xl bg-white/15 p-3 font-semibold">{micError}</p>}
        {hasMic && (
          <p className="mt-3 text-sm text-white/70">Your browser&apos;s speech service (Google, in Chrome) turns your voice into text.</p>
        )}
      </section>

      <div className="space-y-6">
        {match.unknownAddress && !picked && (
          <section className="card p-7">
            <h2 className="text-xl font-bold text-amber-800">That address isn&apos;t on our verified list</h2>
            <p className="mt-2 text-lg text-muted">We won&apos;t open it. Say the company&apos;s name instead, or check the link first.</p>
            <button
              type="button"
              onClick={() => onCheckLink(said.trim())}
              className="mt-5 w-full rounded-2xl bg-ink px-6 py-4 text-lg font-bold text-white hover:opacity-90"
            >
              Check this link
            </button>
          </section>
        )}

        {chosen && (
          <section className="card border-4 border-emerald-300 p-7" aria-live="polite">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ink text-2xl font-extrabold text-white">{chosen.name.charAt(0)}</span>
              <div>
                <h2 className="text-2xl font-extrabold">{chosen.name}</h2>
                <p className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
                  <CheckIcon className="h-4 w-4" /> Verified real address
                </p>
              </div>
            </div>
            <p className="mt-5 rounded-2xl bg-soft p-4 text-center font-mono text-2xl font-bold">{chosen.launchUrl.replace(/^https:\/\//, "")}</p>
            <a
              href={chosen.launchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gradient mt-5 flex w-full items-center justify-center rounded-2xl px-6 py-4 text-xl font-bold text-white"
            >
              Open {chosen.name}
            </a>
            <p className="mt-3 text-center text-sm text-muted">Never type passwords into a site someone texted you.</p>
          </section>
        )}

        {options.filter((b) => b.id !== chosen?.id).length > 0 && (
          <section className="card p-7">
            <h3 className="text-xl font-bold">{said.trim() ? (match.brand ? "Or did you mean" : "Did you mean") : "Popular sites"}</h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {options
                .filter((b) => b.id !== chosen?.id)
                .map((b, i) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => choose(b)}
                      className="flex w-full items-center gap-3 rounded-2xl border-2 border-line bg-white p-3 text-left hover:border-brand"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 font-bold text-brand">{String.fromCharCode(65 + i)}</span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{b.name}</span>
                        <span className="block truncate text-sm text-muted">{b.launchUrl.replace(/^https:\/\//, "")}</span>
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {said.trim() && !chosen && !match.unknownAddress && options.length === 0 && (
          <section className="card p-7">
            <p className="text-lg text-muted">We don&apos;t have that one on our verified list yet. Try the company&apos;s full name.</p>
          </section>
        )}
      </div>
    </div>
  );
}
