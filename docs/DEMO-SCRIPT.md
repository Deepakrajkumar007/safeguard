# LinkGuard 2-minute demo

One story: **an older relative gets a scam text, and LinkGuard warns her, while staying out of her family's texts.**
"Linda" is a stand-in name; use your own relative's story if you have one.

Mirror the iPhone to the projector: Mac **QuickTime Player → File → New Movie Recording → (arrow next to record) →
choose the iPhone**. Turn **Larger text** on in LinkGuard's Home so the room can read it.

## Script (about 2:00)

**0:00–0:15 · The hook**
> "This is Linda. She's 74. Scam texts, fake bank sites, and phishing emails cost people billions a year, and the
> hard part is that the fake link *looks* real. Linda doesn't need a red light. She needs to know *why*, and she
> doesn't want an app reading her family's messages."

**0:15–0:45 · A scam text arrives** *(a teammate who is NOT on the trusted list sends this from another phone)*
```
USPS: Your package could not be delivered. Update now: https://usps.com-redelivery.info/track
```
> "Seconds later, LinkGuard warns her: high risk, fake delivery notice, don't tap the link."
*(show the notification, then open LinkGuard → Text message alerts)*
> "Apple doesn't let any app read your messages, so Linda set up a Shortcut once. And here's her **trusted senders**
> list: her daughter and grandkids. Texts from them are ignored. LinkGuard never checks them."

**0:45–1:10 · Going to the real bank site**
*(Home → Open a website safely → tap the box → keyboard mic → say "Chase")*
> "When Linda wants her bank, she says 'Chase.' Her voice never becomes a web address; LinkGuard only opens addresses
> from a verified list, so she lands on the real chase.com."
*(type `chase-secure-login.top`)*
> "Type a look-alike address and LinkGuard refuses to open it."

**1:10–1:40 · Her email too** *(signed in to Gmail beforehand; see checklist)*
*(Home → Scan my Gmail → Scan last 24 hours → tap a risky email to show the reasons)*
> "It also checks her Gmail, but only the last 24 hours, never the senders she marks private, and with rules, not AI.
> Here's why this one is risky: it says it's from PayPal, but it was sent from a random address. And real emails that
> Gmail verified from her bank aren't flagged."

**1:40–2:00 · Close**
> "LinkGuard: real warnings, real websites, and it stays out of the conversations she trusts. It never says 'safe',
> it shows the warning signs. Built so Linda doesn't need us on the phone every time a text looks weird."

## Pre-demo checklist (30 minutes before)

- [ ] iPhone charged; **Do Not Disturb off** (it hides notifications); volume up.
- [ ] LinkGuard opens on the phone: the **standalone build** (installed from Xcode within 7 days), or Expo Go with the
      laptop running `npx expo start` in `mobile/` on the same network.
- [ ] **Sign in to Gmail in the app within the hour before the demo** (access lasts about 1 hour). Run one scan.
- [ ] Text-alert Shortcut built with `sender` and `trusted` fields, tested once from a non-trusted phone.
- [ ] Trusted list in the app shows a couple of family entries; the teammate sending the scam text is **not** on it.
- [ ] Live server up: open <https://linkguard-khaki.vercel.app> on the laptop.
- [ ] QuickTime mirroring works on the projector.
- [ ] Backup video file open in a second window.

## Backup plan

| If this fails | Do this instead |
|---|---|
| The text alert doesn't fire | Say "Here's the text she got" and show the Text alerts screen; or paste the text in the **web app** at <https://linkguard-khaki.vercel.app> (`/?example=package`). |
| The phone app won't open | Use the **web app** on the laptop: Check a message (example chips, **Upload a screenshot instead** with `demo/fake-usps-text.png`) and **Open a site** (Chrome microphone, `/?tab=open&site=chase`). |
| No internet | Open a website safely still finds the verified address (the list is on the phone). Skip Gmail and alerts; say they need a connection. |
| Gmail asks to sign in again | Sign in (about 15 seconds), or skip to the close. |
| Everything is down | Play the backup video (record it before code freeze with the iPhone's Screen Recording). |

## Likely judge questions

- **"How accurate is it?"** "We haven't benchmarked it on a big dataset yet; that's on the roadmap. We test 37 real
  bank and government login links for zero false alarms, plus scam samples and look-alikes: 220 automated tests."
- **"Can it read iMessages?"** "No app can. Apple blocks it. The user sets up a Shortcut once, which is the honest
  way to do it, and the trusted list keeps family texts out."
- **"Do trusted texts leave the phone?"** "Right now they reach our server, which drops them before checking or
  saving anything. Next is a native Shortcuts action that drops them on the phone."
- **"Privacy for Gmail?"** "Read-only, last 24 hours, never-scan senders excluded inside Gmail's own search, no AI,
  no storage, about one hour of access, and sign-out revokes it."
- **"Why not just a spam filter?"** "Filters are silent and still miss things. LinkGuard shows Linda why, so she
  recognizes the next one."
