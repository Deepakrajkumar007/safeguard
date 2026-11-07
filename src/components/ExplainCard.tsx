"use client";

import type { Explanation } from "@/lib/explain";
import { SparkleIcon, SpeakerIcon, StopIcon } from "./icons";

export type ExplainState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: Explanation }
  | { status: "error"; message: string };

const OPINION: Record<Explanation["second_opinion"], { text: string; cls: string }> = {
  agrees: { text: "Claude agrees with the score", cls: "bg-soft text-ink" },
  more_concerned: { text: "Claude is MORE worried than the score", cls: "bg-rose-50 text-rose-700" },
  less_concerned: { text: "Claude is less worried than the score", cls: "bg-blue-50 text-blue-700" },
};

export function explanationToSpeech(e: Explanation): string {
  return `${e.explanation} ${e.most_important_step}`;
}

export function ExplainCard({
  state,
  speaking,
  onSpeak,
}: {
  state: ExplainState;
  speaking: boolean;
  onSpeak: () => void;
}) {
  if (state.status === "idle") return null;

  return (
    <section className="card p-7 sm:p-8" aria-live="polite" aria-busy={state.status === "loading"}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet-50 text-violet">
            <SparkleIcon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-xl font-bold">In plain English</h3>
            <p className="text-sm text-muted">Written by Claude (AI). The score comes from LinkGuard&apos;s checks, not the AI.</p>
          </div>
        </div>
        {state.status === "done" && (
          <button
            type="button"
            onClick={onSpeak}
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-soft px-4 py-2 text-[0.95rem] font-semibold text-ink hover:bg-line"
          >
            {speaking ? <StopIcon className="h-5 w-5" /> : <SpeakerIcon className="h-5 w-5" />}
            {speaking ? "Stop" : "Read aloud"}
          </button>
        )}
      </div>

      {state.status === "loading" && (
        <div className="mt-5 space-y-3" aria-label="Claude is reading the evidence">
          <p className="text-muted">Claude is reading the evidence…</p>
          <div className="h-4 w-11/12 animate-pulse rounded-full bg-soft" />
          <div className="h-4 w-10/12 animate-pulse rounded-full bg-soft" />
          <div className="h-4 w-7/12 animate-pulse rounded-full bg-soft" />
        </div>
      )}

      {state.status === "error" && <p className="mt-5 text-lg text-muted">{state.message}</p>}

      {state.status === "done" && (
        <div className="mt-5">
          <p className="text-[1.15rem] leading-relaxed text-ink">{state.data.explanation}</p>
          <div className="mt-5 rounded-2xl bg-soft p-4">
            <p className="text-sm font-semibold tracking-[0.12em] text-muted">MOST IMPORTANT</p>
            <p className="mt-1 text-lg font-semibold">{state.data.most_important_step}</p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${OPINION[state.data.second_opinion].cls}`}>
              {OPINION[state.data.second_opinion].text}
            </span>
            <span className="text-sm text-muted">{state.data.second_opinion_reason}</span>
          </div>
        </div>
      )}
    </section>
  );
}
