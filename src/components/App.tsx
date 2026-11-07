"use client";

import { useEffect, useState } from "react";
import { CheckTab } from "./CheckTab";
import { MicIcon, PhoneIcon, ShieldIcon, SpeakerIcon, TextSizeIcon } from "./icons";

type Tab = "check" | "open" | "call";

const TABS: { id: Tab; label: string }[] = [
  { id: "check", label: "Check a message" },
  { id: "open", label: "Open a site" },
  { id: "call", label: "Call guard" },
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

function ComingSoon({ title, body, icon }: { title: string; body: string; icon: React.ReactNode }) {
  return (
    <section className="card mx-auto max-w-2xl p-10 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-soft text-violet">{icon}</span>
      <h2 className="mt-4 text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-lg text-muted">{body}</p>
    </section>
  );
}

export function App() {
  const [tab, setTab] = useState<Tab>("check");
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
            <p className="text-2xl font-extrabold tracking-tight text-ink">LinkGuard</p>
            <p className="text-sm text-ink/70">Spot scam texts, links, and calls</p>
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
        {tab === "check" && <CheckTab autoRead={autoRead} />}
        {tab === "open" && (
          <ComingSoon
            icon={<MicIcon className="h-8 w-8" />}
            title="Open a site by voice"
            body='Say "open Chase" and LinkGuard shows the real website address from a verified list. Coming next.'
          />
        )}
        {tab === "call" && (
          <ComingSoon
            icon={<PhoneIcon className="h-8 w-8" />}
            title="Call guard"
            body="Put a suspicious call on speaker and LinkGuard listens for scam warning signs. Coming soon."
          />
        )}
      </main>

      <footer className="mx-auto mt-12 max-w-3xl text-center text-sm leading-relaxed text-ink/70">
        <p>
          LinkGuard does not save the messages you check. It never says a message is &quot;safe&quot;, only whether it found warning signs.
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
