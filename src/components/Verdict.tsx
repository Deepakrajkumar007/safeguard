"use client";

import { useEffect, useState } from "react";
import type { CheckReport, Evidence, Level, LinkReport } from "@/lib/types";
import { AlertIcon, ChatIcon, CheckIcon, LinkIcon, PhoneIcon, SpeakerIcon, StopIcon } from "./icons";

const LEVEL_PILL: Record<Level, { text: string; cls: string }> = {
  none: { text: "No red flags", cls: "bg-teal-50 text-teal-700" },
  low: { text: "Small signs", cls: "bg-blue-50 text-blue-700" },
  caution: { text: "Be careful", cls: "bg-amber-50 text-amber-800" },
  high: { text: "High risk", cls: "bg-rose-50 text-rose-700" },
};

function useCountUp(target: number, ms = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = reduce ? 1 : Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Always land on the final number, even if animation frames are throttled (background tab).
    const done = setTimeout(() => setValue(target), ms + 100);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
  }, [target, ms]);
  return value;
}

export function RiskMeter({ score, muted = false }: { score: number; muted?: boolean }) {
  const pos = Math.max(2, Math.min(98, score));
  return (
    <div>
      <div className="relative h-3.5 rounded-full">
        <div className={`meter-track absolute inset-0 rounded-full ${muted ? "opacity-30" : ""}`} />
        <div
          className="meter-knob absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-ink bg-white shadow-md"
          style={{ left: `${pos}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-3 grid grid-cols-3 text-sm font-medium text-muted">
        <span>No red flags</span>
        <span className="text-center">Be careful</span>
        <span className="text-right">High risk</span>
      </div>
    </div>
  );
}

function EvidenceIcon({ e }: { e: Evidence }) {
  if (e.good) return <CheckIcon className="h-5 w-5" />;
  if (e.source === "link") return <LinkIcon className="h-5 w-5" />;
  if (e.source === "phone") return <PhoneIcon className="h-5 w-5" />;
  if (e.source === "wording") return <ChatIcon className="h-5 w-5" />;
  return <AlertIcon className="h-5 w-5" />;
}

function iconTint(e: Evidence) {
  if (e.good) return "bg-teal-50 text-teal-600";
  if (e.weight >= 40) return "bg-rose-50 text-rose-600";
  if (e.source === "wording") return "bg-violet-50 text-violet-600";
  if (e.source === "phone") return "bg-amber-50 text-amber-700";
  return "bg-blue-50 text-blue-600";
}

export function EvidenceList({ items }: { items: Evidence[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((e, i) => (
        <li key={`${e.id}-${i}`} className="flex items-start gap-4 py-4">
          <span className={`mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full ${iconTint(e)}`}>
            <EvidenceIcon e={e} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">{e.title}</p>
            <p className="mt-0.5 text-[0.9rem] leading-relaxed text-muted">{e.detail}</p>
          </div>
          {e.good ? (
            <span className="shrink-0 rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-700">Real site</span>
          ) : (
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
                e.weight >= 40 ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800"
              }`}
              title="Risk points"
            >
              +{e.weight}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Shows which part of a web address really matters: the bold part is who owns the site. */
export function HostBreakdown({ link }: { link: LinkReport }) {
  const host = link.hostname;
  const domain = link.domain;
  const idx = domain ? host.lastIndexOf(domain) : -1;
  const before = idx > 0 ? host.slice(0, idx) : "";
  const owner = idx >= 0 && domain ? domain : host;
  return (
    <div className="rounded-2xl bg-soft p-4">
      <p className="break-all font-mono text-[1.05rem]">
        <span className="text-muted">{before}</span>
        <span className={`font-bold underline decoration-2 underline-offset-4 ${link.officialBrand ? "text-teal-700" : "text-rose-700"}`}>
          {owner}
        </span>
      </p>
      <p className="mt-2 text-sm text-muted">
        {link.officialBrand ? (
          <>This goes to <b className="text-ink">{link.officialBrand}</b>&apos;s real website.</>
        ) : (
          <>
            The <b className="text-ink">underlined part</b> is the real website: <b className="text-ink">{owner}</b>.
          </>
        )}
      </p>
    </div>
  );
}

export function VerdictCard({
  report,
  speaking,
  onSpeak,
}: {
  report: CheckReport | null;
  speaking: boolean;
  onSpeak: () => void;
}) {
  const shown = useCountUp(report?.score ?? 0);

  if (!report) {
    return (
      <section className="card p-7 sm:p-8" aria-live="polite">
        <p className="text-sm font-semibold tracking-[0.14em] text-muted">RISK SCORE</p>
        <div className="mt-5 flex items-end gap-3">
          <span className="score-number score-low text-[5.5rem] font-extrabold opacity-25">--</span>
        </div>
        <p className="mt-4 text-lg text-muted">Paste a text message or link, then press <b className="text-ink">Check this message</b>. Your result will show here.</p>
        <div className="mt-8">
          <RiskMeter score={0} muted />
        </div>
      </section>
    );
  }

  const pill = LEVEL_PILL[report.level];
  const reasons = report.evidence.filter((e) => !e.good);
  const goods = report.evidence.filter((e) => e.good);

  return (
    <section className="card p-7 sm:p-8" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold tracking-[0.14em] text-muted">RISK SCORE · CHECKED JUST NOW</p>
        <button
          type="button"
          onClick={onSpeak}
          className="inline-flex shrink-0 items-center whitespace-nowrap gap-2 rounded-full bg-soft px-4 py-2 text-[0.95rem] font-semibold text-ink hover:bg-line"
        >
          {speaking ? <StopIcon className="h-5 w-5" /> : <SpeakerIcon className="h-5 w-5" />}
          {speaking ? "Stop" : "Read aloud"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-x-4 gap-y-2">
        <span className={`score-number score-${report.level} text-[5.5rem] font-extrabold`} aria-label={`Risk score ${report.score} out of 100`}>
          {shown}
        </span>
        <div className="mt-3 flex flex-col gap-2">
          <span className={`w-fit rounded-full px-3 py-1 text-sm font-bold ${pill.cls}`}>{pill.text}</span>
          <span className="text-sm text-muted">out of 100</span>
        </div>
      </div>

      <h2 className="mt-3 text-[1.6rem] font-bold leading-tight text-ink">{report.headline}</h2>
      {report.scamType && (
        <p className="mt-1 text-lg font-semibold text-violet">{report.scamType.label}</p>
      )}
      <p className="mt-2 text-lg leading-relaxed text-muted">{report.summary}</p>

      <div className="mt-7">
        <RiskMeter score={report.score} />
      </div>

      {(reasons.length > 0 || goods.length > 0) && (
        <div className="mt-8">
          <p className="text-sm font-semibold tracking-[0.14em] text-muted">
            {reasons.length ? "WHY WE FLAGGED IT" : "WHAT WE CHECKED"}
          </p>
          <EvidenceList items={[...reasons, ...goods]} />
        </div>
      )}
    </section>
  );
}

export function NextStepsCard({ report }: { report: CheckReport }) {
  const urgent = report.level === "high" || report.level === "caution";
  return (
    <section className="card p-7 sm:p-8">
      <h3 className="text-xl font-bold">{urgent ? "What to do now" : "Good habits"}</h3>
      <ol className="mt-4 space-y-3">
        {report.nextSteps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                urgent && i === 0 ? "bg-rose-600 text-white" : "bg-soft text-ink"
              }`}
            >
              {i + 1}
            </span>
            <span className={`pt-0.5 text-lg leading-snug ${urgent && i === 0 ? "font-bold" : ""}`}>{s}</span>
          </li>
        ))}
      </ol>
      {urgent && (
        <a
          href="https://reportfraud.ftc.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-gradient mt-6 flex w-full items-center justify-center rounded-2xl px-6 py-4 text-lg font-semibold text-white"
        >
          Report it at reportfraud.ftc.gov
        </a>
      )}
    </section>
  );
}

export function LinksCard({ report }: { report: CheckReport }) {
  if (!report.links.length) return null;
  return (
    <section className="card p-7 sm:p-8">
      <h3 className="text-xl font-bold">Where the link really goes</h3>
      <p className="mt-1 text-muted">Only the end of a web address, right before the first &quot;/&quot;, tells you who owns it.</p>
      <div className="mt-4 space-y-3">
        {report.links.map((l, i) => (
          <HostBreakdown key={i} link={l} />
        ))}
      </div>
    </section>
  );
}
