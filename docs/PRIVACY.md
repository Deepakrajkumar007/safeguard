# Privacy and legal notes

SafeGuard is a hackathon project. This note describes what the code does with your data. It is not legal advice.

## The short version

- **The server stores no messages or emails** and doesn't log their contents.
- **Risky texts stay on your iPhone.** Texts SafeGuard warns you about are kept only on the phone, in Recent
  warnings (last 20, one tap to clear). The text alert sends the server only the message text, never the sender.
- **Gmail scanning uses no AI**, reads only the last 24 hours, skips senders you choose, and sends the phone only
  summaries (never email bodies).
- Some features send data to other companies, always for that one feature, as listed below.
- SafeGuard **never says a message is "safe"**. It reports warning signs it found, or that it found none.

## What goes where

| Feature | What leaves your device | Who receives it | Stored by SafeGuard? |
|---|---|---|---|
| Scan my Gmail (app) | Email from the **last 24 hours**, minus your never-scan senders, is read by the SafeGuard server | SafeGuard server (Google sends it); links may be checked with Google Safe Browsing | No |
| Open a website safely (app) | Your spoken words go through the **iPhone keyboard's dictation** (Apple's speech service). The brand match happens on the phone | Apple, per iOS settings | No |
| Text alerts (Shortcuts action) | The **text** of each new message that matches your automation (e.g. contains `http`). The sender is **not** sent | SafeGuard server (rule-based checker); links go to Google Safe Browsing | No. Risky texts and their sender are kept **on the iPhone** in Recent warnings |
| Check a message (app) | The text you paste | SafeGuard server (rule-based checker); links go to Google Safe Browsing | No |
| Never-scan list (Gmail) | Kept in the iPhone **keychain**, sent with each scan so those senders are skipped | SafeGuard server, Gmail search | No |
| Web app: check a message | The message | SafeGuard server (Vercel), Google Safe Browsing for links | No |
| Web app: explain / screenshot | The message or screenshot and the checker's evidence | SafeGuard server, then **Google Gemini** | No |
| Web app: open a site | Your voice goes through the **browser's speech service** (in Chrome, Google's servers) | Your browser vendor | No |

Notes:
- **Gemini free tier:** Google's pricing page says free-tier content is used to improve Google's products; paid-tier
  content is not. For real users, use a paid Gemini key. SafeGuard asks Google not to store the interaction
  (`store: false`), but Google's own terms still apply.
- **Hosting (Vercel):** like any web host, Vercel's platform records request metadata such as time, path, and IP
  address. SafeGuard's code does not log request bodies; errors log only a status code and a short error summary.
- **App install:** the iPhone app is installed directly from Xcode. Expo Go is only used during development.

## Gmail

- Permission requested: `https://www.googleapis.com/auth/gmail.readonly` only. This is Google's narrowest
  permission that can read message content; it technically allows reading all mail.
- **SafeGuard's own limits** (enforced on the server, see `src/lib/gmail.ts`):
  - only `newer_than:1d` (last 24 hours), at most 30 emails per scan
  - senders on your never-scan list are excluded inside the Gmail search; as a safety net, the server then reads
    only each email's **From** line and drops never-scan senders before the email itself is downloaded
  - rule-based checker only; **no email content is sent to an AI**
  - the phone receives sender, subject, score, and reasons only, never email bodies
- **No long-term access:** sign-in requests no refresh token. The access token lasts about an hour, is sealed
  (AES-256-GCM) before it reaches the phone, and is kept in the iPhone keychain. **Sign out** revokes it with Google.
- Google API Services User Data Policy (including Limited Use) applies. SafeGuard uses Gmail data only to show you
  scam warnings, and doesn't sell it, share it, or use it to train AI.
- The Google project is in **Testing** mode (up to 100 test users). Public use would need Google verification and a
  security assessment for this restricted permission.

## Text alerts and Apple

Apple doesn't let apps read Messages. Text alerts work only through a Shortcuts automation **you** create, and you
can delete it at any time (Shortcuts, Automation, swipe left). SafeGuard can't read old messages, block messages, or
see texts the automation doesn't send.

**What the action does.** SafeGuard's "Check Message with SafeGuard" action runs inside the SafeGuard app on your
iPhone. It sends only the message text to the server's rule-based checker. The sender never leaves the phone.

**Recent warnings.** When a text gets a warning, the app keeps that text, its sender, the verdict, and the time in
its private storage on the iPhone, so you can see what was flagged even if you missed the notification. Texts with
no warning signs are not kept. The list holds the last 20 and **Clear** deletes them. It's protected by the phone's
own lock (it isn't in the keychain).

## Phone calls (future feature)

SafeGuard does not record or listen to calls today. Phones don't give apps access to call audio; a future call
feature would listen to a call on speaker through the microphone. **Some US states require all parties to consent
to recording a call**, so such a feature would need to tell users to get consent and avoid storing audio.

## Third-party terms

- Google Safe Browsing Lookup API: free for non-commercial use. Commercial products should use Google Web Risk.
- Google Gemini API, Gmail API: subject to Google's terms and policies.
- Brand names appear only to recognize their real websites. SafeGuard isn't affiliated with them.

## Reporting scams (US)

- Report fraud: <https://reportfraud.ftc.gov>
- Forward scam texts to **7726** (SPAM)
- Identity theft recovery: <https://www.identitytheft.gov>
