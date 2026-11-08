"use client";

import { useEffect, useState } from "react";
import { CheckTab } from "./CheckTab";
import { ShieldIcon, SpeakerIcon, TextSizeIcon } from "./icons";
import { OpenSiteTab } from "./OpenSiteTab";

type Tab = "check" | "open";

const TABS: { id: Tab; label: string }[] = [
  { id: "check", label: "Check a message" },
  { id: "open", label: "Open a site" },
];

function readPref(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}
function writePref(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    /* private mode: setting just won't stick */
  }
}

function Toggle({
  on,
  onClick,
  icon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[0.95rem] font-semibold shadow-sm transition ${
        on ? "bg-ink text-white" : "bg-white/80 text-ink hover:bg-white"
      }`}
    >
      {icon}
      <span>{label}</span>
      <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${on ? "bg-white/20" : "bg-soft"}`}>{on ? "On" : "Off"}</span>
    </button>
  );
}

export function App() {
  const [tab, setTab] = useState<Tab>("check");
  // Lets "Check this link" on the Open a site tab hand a link to the Check tab.
  const [checkSeed, setCheckSeed] = useState<{ n: number; text?: string }>({ n: 0 });
  const [largeText, setLargeText] = useState(false);
  const [autoRead, setAutoRead] = useState(true);

  useEffect(() => {
    // Load saved settings after mount (localStorage isn't available during server render).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLargeText(readPref("lg.largeText", false));
    setAutoRead(readPref("lg.autoRead", true));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("large-text", largeText);
  }, [largeText]);

  // Demo deep link: /?tab=open (optionally &site=chase)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "open") {
      const t = setTimeout(() => setTab("open"), 0);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[conic-gradient(from_200deg,#7c4dff,#2f6bff,#22d3ee,#7c4dff)] p-[3px]">
            <span className="grid h-full w-full place-items-center rounded-full bg-white text-violet">
              <ShieldIcon className="h-6 w-6" />
            </span>
          </span>
          <div>
            <p className="text-2xl font-extrabold tracking-tight text-ink">SafeGuard</p>
            <p className="text-sm text-ink/70">Spot scam texts, links, and emails</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Toggle
            on={largeText}
            onClick={() => {
              setLargeText((v) => {
                writePref("lg.largeText", !v);
                return !v;
              });
            }}
            icon={<TextSizeIcon className="h-5 w-5" />}
            label="Larger text"
          />
          <Toggle
            on={autoRead}
            onClick={() => {
              setAutoRead((v) => {
                writePref("lg.autoRead", !v);
                return !v;
              });
            }}
            icon={<SpeakerIcon className="h-5 w-5" />}
            label="Read results aloud"
          />
        </div>
      </header>

      <nav aria-label="Sections" className="mx-auto mt-6 flex w-full max-w-2xl rounded-full bg-white/60 p-1.5 shadow-sm backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
            className={`flex-1 rounded-full px-3 py-3 text-[0.95rem] font-semibold transition sm:text-base ${
              tab === t.id ? "bg-white text-ink shadow" : "text-ink/70 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="mt-6">
        {tab === "check" && <CheckTab key={checkSeed.n} autoRead={autoRead} initialText={checkSeed.text} />}
        {tab === "open" && (
          <OpenSiteTab
            autoRead={autoRead}
            onCheckLink={(text) => {
              setCheckSeed((s) => ({ n: s.n + 1, text }));
              setTab("check");
            }}
          />
        )}
      </main>

      <footer className="mx-auto mt-12 max-w-3xl text-center text-sm leading-relaxed text-ink/70">
        <p>
          SafeGuard does not save the messages you check. It never says a message is &quot;safe&quot;, only whether it found warning signs.
        </p>
        <p className="mt-1">
          Report scams at{" "}
          <a className="font-semibold underline" href="https://reportfraud.ftc.gov" target="_blank" rel="noopener noreferrer">
            reportfraud.ftc.gov
          </a>
          . Forward scam texts to 7726.
        </p>
      </footer>
    </div>
  );
}
