# Privacy and legal notes

LinkGuard is a hackathon project. This note describes what the code does with your data. It is not legal advice.

## The short version

- **Messages and emails are not stored** by LinkGuard, and the server doesn't log their contents.
- **Texts from trusted senders are ignored.** LinkGuard drops them before checking anything.
- **Gmail scanning uses no AI**, reads only the last 24 hours, skips senders you choose, and sends the phone only
  summaries (never email bodies).
- Some features send data to other companies, always for that one feature, as listed below.
- LinkGuard **never says a message is "safe"**. It reports warning signs it found, or that it found none.

## What goes where

| Feature | What leaves your device | Who receives it | Stored by LinkGuard? |
|---|---|---|---|
| Scan my Gmail (app) | Email from the **last 24 hours**, minus your never-scan senders, is read by the LinkGuard server | LinkGuard server (Google sends it); links may be checked with Google Safe Browsing | No |
| Open a website safely (app) | Your spoken words go through the **iPhone keyboard's dictation** (Apple's speech service). The brand match happens on the phone | Apple, per iOS settings | No |
| Text alerts (Shortcuts) | Each new text that matches your automation (e.g. contains `http`), plus its **sender** and your **trusted list** | LinkGuard server; if the sender isn't trusted, the rule-based checker runs and links go to Google Safe Browsing | No |
| Trusted senders list | Kept in the iPhone **keychain**. You copy it into your Shortcut, which sends it with each text | LinkGuard server (to compare, then discarded) | No |
| Never-scan list (Gmail) | Kept in the iPhone **keychain**, sent with each scan so Gmail excludes those senders | LinkGuard server, Gmail search | No |
| Web app: check a message | The message | LinkGuard server (Vercel), Google Safe Browsing for links | No |
| Web app: explain / screenshot | The message or screenshot and the checker's evidence | LinkGuard server, then **Google Gemini** | No |
| Web app: open a site | Your voice goes through the **browser's speech service** (in Chrome, Google's servers) | Your browser vendor | No |

Notes:
- **Gemini free tier:** Google's pricing page says free-tier content is used to improve Google's products; paid-tier
  content is not. For real users, use a paid Gemini key. LinkGuard asks Google not to store the interaction
  (`store: false`), but Google's own terms still apply.
- **Hosting (Vercel):** like any web host, Vercel's platform records request metadata such as time, path, and IP
  address. LinkGuard's code does not log request bodies; errors log only a status code and a short error summary.
- **Expo Go:** during development the app runs inside Expo's Expo Go app.

## Gmail

- Permission requested: `https://www.googleapis.com/auth/gmail.readonly` only. This is Google's narrowest
  permission that can read message content; it technically allows reading all mail.
- **LinkGuard's own limits** (enforced on the server, see `src/lib/gmail.ts`):
  - only `newer_than:1d` (last 24 hours), at most 30 emails per scan
  - senders on your never-scan list are excluded inside the Gmail search, so they are never downloaded
  - rule-based checker only; **no email content is sent to an AI**
  - the phone receives sender, subject, score, and reasons only, never email bodies
- **No long-term access:** sign-in requests no refresh token. The access token lasts about an hour, is sealed
  (AES-256-GCM) before it reaches the phone, and is kept in the iPhone keychain. **Sign out** revokes it with Google.
- Google API Services User Data Policy (including Limited Use) applies. LinkGuard uses Gmail data only to show you
  scam warnings, and doesn't sell it, share it, or use it to train AI.
- The Google project is in **Testing** mode (up to 100 test users). Public use would need Google verification and a
  security assessment for this restricted permission.

## Text alerts and Apple

Apple doesn't let apps read Messages. Text alerts work only through a Shortcuts automation **you** create, and you
can delete it at any time (Shortcuts, Automation, swipe left). LinkGuard can't read old messages, block messages, or
see texts the automation doesn't send.

**Trusted senders.** In the current version, the Shortcut sends each matching text with its sender and your trusted
list. If the sender is trusted, the server returns immediately: the text is not checked, logged, or stored. It does
still travel to the server. The planned native Shortcuts action will compare the sender **on the phone**, so trusted
senders' texts never leave it.

## Phone calls (future feature)

LinkGuard does not record or listen to calls today. Phones don't give apps access to call audio; a future call
feature would listen to a call on speaker through the microphone. **Some US states require all parties to consent
to recording a call**, so such a feature would need to tell users to get consent and avoid storing audio.

## Third-party terms

- Google Safe Browsing Lookup API: free for non-commercial use. Commercial products should use Google Web Risk.
- Google Gemini API, Gmail API: subject to Google's terms and policies.
- Brand names appear only to recognize their real websites. LinkGuard isn't affiliated with them.

## Reporting scams (US)

- Report fraud: <https://reportfraud.ftc.gov>
- Forward scam texts to **7726** (SPAM)
- Identity theft recovery: <https://www.identitytheft.gov>
