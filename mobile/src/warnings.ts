import { requireOptionalNativeModule } from "expo";

/**
 * Recent text warnings, written on the iPhone by the "Check Message with SafeGuard" Shortcuts action
 * (app-intents/SafeGuardWarnings.swift). Each entry is a text SafeGuard warned about, who sent it, the
 * verdict, and the time. Kept only on this iPhone (at most 20) and never sent anywhere. Not in Expo Go.
 */
export interface TextWarning {
  at: number;
  level: "high" | "caution";
  title: string;
  body: string;
  message: string;
  sender: string;
  notified: boolean;
  test: boolean;
}

interface NativeWarnings {
  list(): unknown[];
  addTest(level: string, title: string, body: string, message: string, sender: string): void;
  clear(): void;
}

const native = requireOptionalNativeModule<NativeWarnings>("SafeGuardWarnings");

export function loadWarnings(): TextWarning[] {
  if (!native) return [];
  try {
    return native.list().flatMap((raw) => {
      const w = raw as Partial<TextWarning>;
      if (typeof w.at !== "number" || typeof w.title !== "string") return [];
      return [
        {
          at: w.at,
          level: w.level === "high" ? "high" : "caution",
          title: w.title,
          body: typeof w.body === "string" ? w.body : "",
          message: typeof w.message === "string" ? w.message : "",
          sender: typeof w.sender === "string" ? w.sender : "",
          notified: w.notified !== false,
          test: w.test === true,
        },
      ];
    });
  } catch {
    return [];
  }
}

export function addTestWarning(level: string, title: string, body: string, message: string, sender: string): void {
  try {
    native?.addTest(level, title, body, message.slice(0, 1000), sender.slice(0, 120));
  } catch {
    /* the on-screen result still shows */
  }
}

export function clearWarnings(): void {
  try {
    native?.clear();
  } catch {
    /* nothing to clear */
  }
}
