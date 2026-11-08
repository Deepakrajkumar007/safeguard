# Scam-text alerts on iPhone (Shortcuts automation)

Apple does not let any app read your Messages. LinkGuard gets around this the honest way: **you** set up a
Shortcuts automation that sends each new text to your LinkGuard server, and Shortcuts shows a notification
when the checker finds warning signs.

- Only LinkGuard's **rule-based checker** runs on these texts. No AI, and nothing is saved or logged.
- It can't block, delete, or read old messages. It only sees the text the automation hands it.
- You can turn it off any time: Shortcuts → Automation → swipe left on it → Delete.

## What you need

- An iPhone with iOS 17 or later (for "Run Immediately").
- The server address: `https://<your-deployment>.vercel.app/api/shortcut`
- Your app key (`LINKGUARD_APP_KEY` from `.env.local`). Copy it on your Mac; with Universal Clipboard you
  can paste it on your iPhone. **Don't share it or put it in screenshots.**

## Build it (about 5 minutes)

1. Open **Shortcuts** → **Automation** tab → **+** (New Automation).
2. Tap **Message**.
3. Leave **Sender** as anyone. For **Message Contains**:
   - Type `http` to check every text that has a link in it (most scam texts do).
   - If your iPhone lets you continue with this left empty, leave it empty to check every text.
4. Choose **Run Immediately** and turn **off** "Notify When Run". Tap **Next**.
5. Tap **New Blank Automation**.
6. Add the action **Get Contents of URL**.
   - URL: `https://<your-deployment>.vercel.app/api/shortcut`
   - Tap the **›** arrow to show more options. **Method**: `POST`.
   - **Headers** → Add new header. Key: `x-linkguard-key`. Value: paste your app key.
   - **Request Body**: `JSON` → Add new field → **Text**. Key: `text`. Value: tap it and choose
     **Shortcut Input** (the message that just arrived). If you can tap that variable again, pick **Content**
     so only the message text is sent.
7. Add **Get Dictionary Value**: Get **Value** for `show` in **Contents of URL**.
8. Add **If**: **Dictionary Value** · **is** · `yes`.
9. Inside the If (before "Otherwise"):
   - Add **Get Dictionary Value**: Get **Value** for `notification` in **Contents of URL**
     (tap the input and choose *Contents of URL* explicitly).
   - Add **Show Notification** and set its text to that **Dictionary Value**.
10. Tap **Done**.

## Test it

Ask a friend to text you this (the link is a made-up scam address; don't tap it):

```
USPS: Your package could not be delivered. Update now: https://usps.com-redelivery.info/track
```

Within a few seconds you should see **"LinkGuard: High risk text. Looks like a fake delivery notice.
Don't tap the link."** A normal text like `See you at 6! https://www.amazon.com/gp/your-account` shows nothing.

Tip: a text you send to yourself may not trigger the automation. Use another phone, or the Messages app on a
Mac signed in with a different Apple ID.

## How it works

```
New text arrives → Shortcuts automation → POST /api/shortcut {"text": "..."} (with x-linkguard-key)
                 → rule-based checker → {"show": "yes", "notification": "..."} → Show Notification
```

## Limits

- Apple decides when automations run; once in a while one may be delayed or skipped.
- With the `http` filter, scam texts that have no link (for example, "Grandma, it's me, I need bail money")
  won't be checked automatically. Paste those into the app.
- The app key ships inside the iPhone app, so it slows down abuse but isn't strong security.
