# Scam-text alerts on iPhone (Shortcuts automation)

Apple does not let any app read your Messages. LinkGuard works the honest way: **you** add one Shortcuts automation
that hands each new text with a link to LinkGuard's **"Check Message with LinkGuard"** action. If the checker finds
warning signs, LinkGuard shows a notification and adds the text to **Recent warnings** in the app.

- Only LinkGuard's **rule-based checker** runs on these texts. No AI.
- Only the **message text** is sent to the LinkGuard server, which doesn't save or log it.
- The **sender** stays on your iPhone. It's shown in Recent warnings so you know who texted.
- It can't block, delete, or read old messages. It only sees the text the automation hands it.
- Turn it off any time: Shortcuts → Automation → swipe left on it → Delete.

You need the installed LinkGuard app (the action isn't available inside Expo Go) and LinkGuard notifications turned
on (LinkGuard → Text alerts shows "Notifications on").

## Set it up once (2 minutes)

The same steps are on LinkGuard's **Text alerts** screen.

1. **Start a Message automation.** Open **Shortcuts**. Tap **Automation** at the bottom, then **+**, then **Message**.
2. **Type http in Message Contains.** Tap **Message Contains**, type `http`, tap **Done**. (iOS requires a word here.)
   Choose **Run Immediately**, tap **Next**, then **New Blank Automation**.
3. **Add LinkGuard's action.** Search for "LinkGuard" and tap **Check Message with LinkGuard**.
4. **Fill in the two blue words.** Tap **Message** and choose **Shortcut Input**. Tap **Sender**, choose
   **Shortcut Input**, then tap it again and choose **Sender**.
5. **Tap Done.**

## Test it

**Without a second phone:** in LinkGuard → Text alerts, tap **Send a test warning**. You get the notification, and a
"(test)" card appears in Recent warnings. To check any text yourself, paste it into **Check a message** on Home.

**For real:** ask someone else to text you this (a made-up scam address; don't tap it):

```
USPS: Your package could not be delivered. Update now: https://usps.com-redelivery.info/track
```

You should get **"LinkGuard: High risk text. Looks like a fake delivery notice. Don't tap the link."** Tap it to
open Recent warnings, which shows the text, the sender's number, and the reason.

## How it works

```
New text containing "http" → Shortcuts automation → "Check Message with LinkGuard" (runs in the LinkGuard app)
  ├─ POST /api/shortcut {"text"} with x-linkguard-key → rule-based checker (+ Safe Browsing for links)
  ├─ "high" or "caution" → LinkGuard notification (tap opens Text alerts) + card in Recent warnings
  │                         (if the notification can't be shown, Shortcuts shows the warning instead)
  └─ otherwise → nothing happens
```

Code: `mobile/app-intents/CheckMessageIntent.swift` (the action), `mobile/app-intents/LinkGuardWarnings.swift`
(Recent warnings), `src/app/api/shortcut/route.ts` (the server check).

## Limits

- Apple decides when automations run. Texts you send yourself may not trigger it.
- With `http`, texts without links aren't checked. Use the letter `e` in step 2 to check almost every text instead.
- Recent warnings keeps the last 20 risky texts on the iPhone. Tap **Clear** to delete them.
