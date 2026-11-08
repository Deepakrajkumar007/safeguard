# Scam-text alerts on iPhone (Shortcuts automation)

Apple does not let any app read your Messages. LinkGuard works the honest way: **you** set up a Shortcuts
automation that sends each new text with a link to your LinkGuard server, and Shortcuts shows a notification when
the checker finds warning signs. Texts from your **trusted senders** are ignored.

- Only LinkGuard's **rule-based checker** runs on these texts. No AI, and nothing is saved or logged.
- Texts from trusted senders are dropped before any check.
- It can't block, delete, or read old messages. It only sees the text the automation hands it.
- Turn it off any time: Shortcuts → Automation → swipe left on it → Delete.

## In the app first

Open LinkGuard → **Text message alerts**:

1. Under **Trusted senders**, add the people LinkGuard should ignore: phone numbers in any format, iCloud/email
   addresses, or contact names exactly as Messages shows them (for example `Mom`).
2. Use the buttons at the bottom: **Copy server address**, **Copy app key**, and **Copy trusted list**. You'll paste
   each into the Shortcut. (Copy one, paste it, then come back for the next.)

## Build the automation (about 5 minutes, iOS 17 or later)

1. Open **Shortcuts** → **Automation** tab → **+** → **Message**.
2. Leave **Sender** as anyone. For **Message Contains**, type `http` to check every text that has a link (most scam
   texts do). If your iPhone lets you continue with this empty, leave it empty to check every text.
3. Choose **Run Immediately**, turn **off** "Notify When Run", tap **Next** → **New Blank Automation**.
4. Add the action **Get Contents of URL**:
   - URL: paste the **server address** (`https://<your-deployment>.vercel.app/api/shortcut`).
   - Tap **›** for more options. **Method**: `POST`.
   - **Headers** → Add new header. Key: `x-linkguard-key`. Value: paste the **app key**.
   - **Request Body**: `JSON`. Add three **Text** fields:
     - `text` = **Shortcut Input** (the message that just arrived; if you can, tap it and choose **Content**)
     - `sender` = **Shortcut Input**, then tap it and choose **Sender**
     - `trusted` = paste your **trusted list**
5. Add **Get Dictionary Value**: Get **Value** for `show` in **Contents of URL**.
6. Add **If**: **Dictionary Value** · **is** · `yes`.
7. Inside the If (before "Otherwise"):
   - **Get Dictionary Value**: Get **Value** for `notification` in **Contents of URL** (choose *Contents of URL*
     explicitly as the input).
   - **Show Notification** with that **Dictionary Value**.
8. Tap **Done**.

**After you change your trusted list in the app**, tap **Copy trusted list** again and replace the `trusted` value in
the Shortcut.

## Test it

Ask a friend who is **not** on your trusted list to text you this (a made-up scam address; don't tap it):

```
USPS: Your package could not be delivered. Update now: https://usps.com-redelivery.info/track
```

Within a few seconds you should see **"LinkGuard: High risk text. Looks like a fake delivery notice. Don't tap the
link."** Then add that friend to your trusted list, update the Shortcut, and have them send it again: nothing
should appear. A normal text like `See you at 6! https://www.amazon.com/gp/your-account` shows nothing either.

A text you send to yourself may not trigger the automation. Use another phone, or the Messages app on a Mac signed
in with a different Apple ID.

## How it works

```
New text → Shortcuts automation → POST /api/shortcut {"text", "sender", "trusted"} (with x-linkguard-key)
  ├─ sender is on the trusted list → {"show": "no", "skipped": true}   (nothing checked or saved)
  └─ otherwise → rule-based checker (+ Google Safe Browsing for links) → {"show": "yes", "notification": "..."}
                                                                       → Show Notification
```

## Limits

- **The trusted list needs the sender.** If your iPhone's Shortcuts doesn't offer **Sender** on Shortcut Input, the
  trusted list can't work yet; alerts still work without it.
- Messages may report a saved contact by **name** instead of number. Add the name exactly as Messages shows it.
- In the current version, trusted senders' texts still travel to the server before being dropped. A planned
  native Shortcuts action will compare the sender on the phone instead.
- Apple decides when automations run; once in a while one may be delayed or skipped.
- With the `http` filter, scam texts that have no link (for example, "Grandma, it's me, I need bail money") won't
  be checked automatically.
- The app key ships inside the iPhone app, so it slows down abuse but isn't strong security.
