# LinkGuard 2-minute demo

One story: **an older relative gets a scam text, and LinkGuard catches it and explains why.**
"Linda" is a stand-in name; use your own relative's story if you have one.

Mirror the iPhone to the projector: Mac **QuickTime Player → File → New Movie Recording → (arrow next to record) → choose the iPhone**.
Turn **Larger text: On** so the room can read it.

## Script (about 2:00)

**0:00–0:15 · The hook**
> "This is Linda. She's 74. Yesterday she got this text." *(hold up the phone)*
> "Scam texts cost people billions a year, and the hard part is that the fake link *looks* real. Most tools give you a red light. Linda needs to know *why*."

**0:15–0:45 · The scam text arrives** *(a teammate or friend sends the USPS sample from another phone)*
```
USPS: Your package could not be delivered. Update now: https://usps.com-redelivery.info/track
```
> "Her phone shows a LinkGuard warning, from a Shortcut she set up once." *(show the "LinkGuard: High risk text" notification)*
> "She opens LinkGuard, taps Check text, and pastes it."
*(Check a message → Paste → Check it.)* The result reads aloud.
> "High risk, a fake delivery notice. And look *why*: the address starts with 'usps', but the real site is the underlined part, `com-redelivery.info`. That's the one thing everyone should learn about links."
*(scroll to "What to do now")*
> "And it tells her what to do: don't tap, forward to 7726, report it to the FTC."

**0:45–1:05 · Plain English, but the AI doesn't decide**
*(tap **Explain it simply**)*
> "If she wants it in plain words, Gemini explains. But the score comes from our open rule-based checker. The AI only explains it, and it can't change the verdict or call anything 'safe.' LinkGuard never says safe."

**1:05–1:25 · Going to the real site**
*(Home → Open a site → tap the field → keyboard mic → say "Chase")*
> "When Linda wants her bank, she just says 'Chase.' Speech never becomes a web address; we only open addresses from a verified list."
*(type `chase-secure-login.top`)*
> "Type a fake address and we refuse to open it, and offer to check it instead."

**1:25–1:45 · Her email too** *(signed in to Gmail beforehand; see checklist)*
*(Home → Gmail → Scan last 24 hours)*
> "It also scans her Gmail, but only the last 24 hours, never senders she marks private, with rules only and no AI. It just found these risky emails, and it trusts emails Gmail verified really came from her bank."

**1:45–2:00 · Close**
> "LinkGuard: checked on her phone, explains the why, never says 'safe,' and keeps her data hers. Built so Linda doesn't need us on the phone every time a text looks weird."

## Pre-demo checklist (do 30 minutes before)

- [ ] iPhone charged; **Do Not Disturb off** (it hides notifications); volume up.
- [ ] LinkGuard opens on the phone (Expo Go: laptop running `npx expo start` in `mobile/` on the same network, **or** the standalone build).
- [ ] **Sign in to Gmail in the app within the hour before the demo** (access lasts about 1 hour). Run one scan.
- [ ] Text-alert Shortcut built and tested once; the friend has the USPS sample ready to send.
- [ ] Live server up: open <https://linkguard-khaki.vercel.app> on the laptop.
- [ ] QuickTime mirroring works on the projector.
- [ ] Backup video file open in a second window.

## Backup plan

| If this fails | Do this instead |
|---|---|
| The text alert doesn't fire | Skip it: "Here's the text she got." Paste it in the app. |
| The phone or Expo Go won't load | Use the **web app** at <https://linkguard-khaki.vercel.app> on the laptop: example chips ("Package text", "Grandkid in trouble"), **Upload a screenshot instead** with `demo/fake-usps-text.png`, and the **Open a site** tab (Chrome microphone). Demo deep links: `/?example=package`, `/?tab=open&site=chase`. |
| No internet | Check a message still works in the app (the checker runs on the phone). Skip Explain, Gmail, and Safe Browsing; say they need a connection. |
| Gmail asks to sign in again | Sign in (about 15 seconds), or skip to the close. |
| Everything is down | Play the backup video (record it before code freeze with the iPhone's Screen Recording). |

## Likely judge questions

- **"How accurate is it?"** "We haven't benchmarked it on a big dataset yet. That's next on the roadmap. We tested 37 real bank and government login links for zero false alarms, plus scam samples and tricky look-alikes, with 198 automated tests."
- **"Why not just use the spam filter?"** "Filters are silent and still miss things. Linda needs to understand *why* so she recognizes the next one. LinkGuard teaches the one rule: the real site is the part before the first slash."
- **"Can the AI be tricked?"** "The AI never decides. The message is fenced as untrusted data, and the score comes from deterministic rules plus Google Safe Browsing."
- **"Privacy?"** "Checks run on the phone, nothing is stored, Gmail is limited to 24 hours and skips private senders, and only links go to Google Safe Browsing."
- **"Can it read iMessages?"** "No app can. Apple blocks it. The user sets up a Shortcuts automation once, and that's the honest way to do it."
