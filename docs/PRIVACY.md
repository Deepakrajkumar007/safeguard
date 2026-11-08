# Privacy and legal notes

LinkGuard is a hackathon project. This note describes what the code does with your data. It is not legal advice.

## The short version

- **Messages you check are not stored** by LinkGuard, on the phone or the server, and the server doesn't log
  message contents.
- **The app checks messages on the phone.** The verdict doesn't need the internet.
- Some features send data to other companies, always for that one feature, as listed below.
- LinkGuard **never says a message is "safe"**. It reports warning signs it found, or that it found none.

## What goes where

| Feature | What leaves your device | Who receives it | Stored by LinkGuard? |
|---|---|---|---|
| Check a message (app) | Nothing for the verdict | No one | No |
| Google Safe Browsing check | **Only the links** in the message | LinkGuard server, then Google Safe Browsing | No (5-minute in-memory cache of link results) |
| Explain it simply | The message and the checker's evidence | LinkGuard server, then **Google Gemini** | No |
| Check a message (web) | The message | LinkGuard server (Vercel) | No |
| Screenshot reading (web) | The screenshot image | LinkGuard server, then **Google Gemini** | No |
| Open a site (app) | Your spoken words go through the **iPhone keyboard's dictation** (Apple's speech service) | Apple, per iOS settings | No |
| Open a site (web) | Your voice goes through the **browser's speech service** (in Chrome, Google's servers) | Your browser vendor | No |
| Scan my Gmail | Email from the **last 24 hours**, minus your never-scan senders, is read by the LinkGuard server | LinkGuard server (Google sends it) | No |
| Text alerts (Shortcuts) | Each new text that matches your automation (e.g. contains `http`) | LinkGuard server, then Safe Browsing for its links | No |

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
