# SafeGuard 2-minute demo

One story: **an older relative gets a scam text, and SafeGuard warns her and shows her why.**
"Linda" is a stand-in name; use your own relative's story if you have one.

Mirror the iPhone to the projector: Mac **QuickTime Player → File → New Movie Recording → (arrow next to record) →
choose the iPhone**. Turn **Larger text** on in SafeGuard's Settings so the room can read it. Pick Light or Dark with
the **Dark mode** switch, whichever shows better on the projector.

## Script (about 2:00)

**0:00–0:15 · The hook**
> "This is Linda. She's 74. Scam texts, fake bank sites, and phishing emails cost people billions a year, and the
> hard part is that the fake link *looks* real. Linda doesn't need a red light. She needs to know *why*."

**0:15–0:45 · A scam text arrives** *(a teammate texts this to the demo iPhone from their own phone)*
```
USPS: Your package could not be delivered. Update now: https://usps.com-redelivery.info/track
```
> "Seconds later, SafeGuard warns her: high risk, fake delivery notice, don't tap the link."
*(show the notification, tap it: SafeGuard opens Text alerts → Recent warnings)*
> "Apple doesn't let any app read your messages, so Linda added one Shortcut, once. Even if she missed the
> notification, here's the text, who sent it, and why it's risky. And that list stays on her phone."

**0:45–1:05 · Going to the real bank site**
*(Back → Open a website → tap the box → keyboard mic → say "Chase")*
> "When Linda wants her bank, she says 'Chase.' Her voice never becomes a web address; SafeGuard only opens addresses
> from a verified list, so she lands on the real chase.com."
*(type `chase-secure-login.top`)*
> "Type a look-alike address and SafeGuard refuses to open it."

**1:05–1:25 · Anything else she's unsure about**
*(Back → Home → Check a message → paste a suspicious message, or tap "Try an example scam text" → Check this message)*
> "Got a weird email or a message in another app? She pastes it here and gets the answer in plain English."

**1:25–1:45 · Her email too** *(signed in to Gmail beforehand; see checklist)*
*(Home → Scan my Gmail → Scan last 24 hours → tap a risky email to show the reasons)*
> "It also checks her Gmail, but only the last 24 hours, never the senders she marks private, and with rules, not AI.
> Real emails that Gmail verified from her bank or from Facebook aren't flagged."

**1:45–2:00 · Close**
> "SafeGuard: real warnings, real websites, and the reasons behind them. It never says 'safe', it shows the warning
> signs. Built so Linda doesn't need us on the phone every time a text looks weird."

## Pre-demo checklist (30 minutes before)

- [ ] iPhone charged; **Do Not Disturb and Focus off** (they hide notifications); volume up.
- [ ] SafeGuard installed from Xcode within the last 7 days, and it opens.
- [ ] SafeGuard → Text alerts shows **Notifications on**.
- [ ] Shortcuts automation built (Message Contains `http`, Run Immediately, **Check Message with SafeGuard** with
      Message and Sender filled in). Tested once with a text from the teammate's phone.
- [ ] **Clear** old cards in Recent warnings so the new one stands out.
- [ ] **Sign in to Gmail in the app within the hour before the demo** (access lasts about 1 hour). Run one scan.
- [ ] Live server up: <https://linkguard-khaki.vercel.app> shows the one-line SafeGuard page.
- [ ] QuickTime mirroring works on the projector.
- [ ] Backup video file open in a second window.

## Backup plan

| If this fails | Do this instead |
|---|---|
| The text alert doesn't fire | Text alerts → **Send a test warning** (notification + Recent warnings card), or paste the scam text into **Check a message** on Home. |
| The phone app won't open | Play the backup video, and walk through the screens in it. |
| No internet | Open a website safely still finds the verified address (the list is on the phone). Skip Gmail and alerts; say they need a connection. |
| Gmail asks to sign in again | Sign in (about 15 seconds), or skip to the close. |
| Everything is down | Play the backup video (record it before the deadline with the iPhone's Screen Recording). |

## Likely judge questions

- **"How accurate is it?"** "We haven't benchmarked it on a big dataset yet; that's on the roadmap. We test 37 real
  bank and government login links for zero false alarms, plus scam samples and look-alikes: 190 automated tests."
- **"Can it read iMessages?"** "No app can. Apple blocks it. The user adds one Shortcut that hands new texts with links
  to SafeGuard's own action. That's the honest way to do it."
- **"What leaves the phone?"** "For texts, only the message text goes to our rule-based checker, and the server
  doesn't save it. The sender and the list of warnings stay on the phone."
- **"Privacy for Gmail?"** "Read-only, last 24 hours, never-scan senders skipped before their emails are downloaded,
  no AI, no storage, about one hour of access, and sign-out revokes it."
- **"Why not just a spam filter?"** "Filters are silent and still miss things. SafeGuard shows Linda why, so she
  recognizes the next one."
