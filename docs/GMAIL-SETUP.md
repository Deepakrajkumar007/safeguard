# Gmail scanning: setup and privacy

SafeGuard can scan your recent Gmail for scam emails with its **rule-based checker** (no AI).

## What it does and doesn't do

| | |
|---|---|
| Time window | Only emails from the **last 24 hours** (`newer_than:1d`), at most 30 |
| Never-scan list | Senders you list (`boss@work.com` or `@work.com`) are excluded **inside the Gmail search**, so SafeGuard never downloads them |
| Checking | Rule-based checker only. No AI sees your email |
| What the phone gets | Sender, subject, risk score, and reasons. **Never the email body** |
| Storage | Nothing is saved or logged. Email contents are checked in memory |
| Access length | About **1 hour**. No refresh token is requested, so access ends on its own. **Sign out** cancels it right away |
| Verified senders | If Gmail confirms (DMARC pass) an email really came from a brand on SafeGuard's verified list, it isn't flagged |

**Honest limit:** Google's narrowest permission for reading mail is `gmail.readonly` ("read your email"). Google
has no permission that limits by date or sender. The 24-hour window and never-scan list are enforced by
SafeGuard's own server code (`src/lib/gmail.ts`, `buildQuery`), which you can read and test.

## Setup (Google Cloud, about 20 minutes)

1. Go to <https://console.cloud.google.com> and create a project (e.g. **SafeGuard**).
2. **APIs & Services → Library** → search **Gmail API** → **Enable**.
3. **OAuth consent screen** (may be called **Google Auth Platform**):
   - App name **SafeGuard**, your email as support email, audience **External**, publishing status **Testing**.
   - **Test users**: add the Gmail address(es) that will sign in. In Testing mode only these accounts can use it.
   - **Data access / Scopes**: add `https://www.googleapis.com/auth/gmail.readonly`.
4. **Credentials → Create credentials → OAuth client ID → Web application**.
   - **Authorized redirect URIs**: `https://<your-domain>/api/gmail/callback`
     (for local testing also `http://localhost:3000/api/gmail/callback`).
5. Put the values in `.env.local` (never commit it), and in your host's secret settings:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   SESSION_SECRET=<openssl rand -hex 32>
   ```

When you sign in, Google will say **"Google hasn't verified this app."** That's expected for an app in Testing
mode. Tap **Continue**. Make sure the **"Read your email"** box is ticked, or SafeGuard can't scan.

A public launch would need Google's app verification and, for this restricted permission, an annual security
assessment.

## How sign-in works

```
App → /api/gmail/start (state + PKCE, sealed cookie) → Google consent → /api/gmail/callback
    → token exchange on the server (client secret never leaves the server)
    → app receives a sealed, encrypted 1-hour session (stored in the iPhone keychain)
App → /api/gmail/scan (session + app key + never-scan list) → summary of risky emails
```
