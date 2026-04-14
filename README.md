```
     _          _    ___  _  __       
    | |        / \  |_ _|(_)/ _|_   _ 
  __| | ___   / _ \  | | | | |_| | | |
 / _` |/ _ \ / ___ \ | | | |  _| |_| |
| (_| |  __// ___ _\|___|_|_|  \__, |
 \__,_|\___\_/   \_/            |___/ 
```

# deAIify

### An OpenClaw Plugin

---

## HI, BILLY MAYS HERE FOR deAIify!

ARE YOU TIRED of your LLM dropping em-dashes into every single response -- making your automated tweets look like a 19th century periodical and TANKING your engagement?

Does your AI assistant write like it swallowed a Victorian typewriter? Do your Slack bots sound like they're narrating a Dickens novel? Is every sentence interrupted by those PRETENTIOUS little horizontal lines that SCREAM "a robot wrote this"?

**Well BILLY MAYS HERE with deAIify!**

The ONLY OpenClaw plugin that doesn't just find-and-replace your dashes like some AMATEUR HOUR regex script. No sir. deAIify CANCELS THE ENTIRE MESSAGE and makes the LLM TRY AGAIN. Like a disappointed parent returning a C-minus essay. "Do it again. DO IT RIGHT."

---

## WHAT DOES IT DO?

- **CATCHES** em-dashes (U+2014) and en-dashes (U+2013) BEFORE they reach your users
- **CANCELS** the offending message entirely -- NO partial delivery, NO dash residue
- **INJECTS** a correction prompt that tells the LLM to RESTRUCTURE its sentences like a PROFESSIONAL
- **RETRIES** automatically -- gives the LLM multiple chances to get it right (because we're GENEROUS)
- **SHIPS AS-IS** after max retries -- because even Billy Mays knows when to cut his losses

This isn't a find-and-replace. This is a FULL ARCHITECTURAL INTERVENTION. We don't put a band-aid on the dash. We send the whole sentence back to the FACTORY.

---

## HOW DOES IT WORK?

```
  ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
  │  LLM writes │────>│  HOOK 1:     │────>│  Dashes found?  │
  │  a response │     │  message_    │     │                 │
  │             │     │  sending     │     │  YES: CANCEL IT │
  └─────────────┘     └──────────────┘     │  NO: SHIP IT    │
                                           └────────┬────────┘
                                                    │ (cancelled)
                                                    v
                        ┌──────────────┐     ┌─────────────────┐
                        │  HOOK 2:     │────>│  Inject prompt: │
                        │  before_     │     │  "REWRITE THAT  │
                        │  agent_reply │     │   WITHOUT THE   │
                        │              │     │   DASHES, PAL"  │
                        └──────────────┘     └─────────────────┘
```

### THE MIRACLE TWO-HOOK FORMULA

**Hook 1: `message_sending`** -- The BOUNCER at the door. Every outbound assistant message passes through this bad boy. It scans for those sneaky Unicode dashes. If it finds one? MESSAGE DENIED. Cancelled. Rejected. Sent back where it came from. If the message is clean? Green light, go on through, you beautiful dash-free angel.

**Hook 2: `before_agent_reply`** -- The COACH in the locker room. After Hook 1 cancels a message, Hook 2 steps in and whispers sweet corrections into the LLM's ear. It injects a synthetic user message that says "hey, try that again, but this time write like someone who's used the internet after 1997." The LLM regenerates. Hook 1 checks again. The cycle continues until the output is CLEAN or we hit max retries.

It's like having a QUALITY CONTROL DEPARTMENT for your AI output, except it runs in MILLISECONDS and doesn't take lunch breaks!

---

## BUT WAIT -- THERE'S MORE!

You thought this was just a one-trick pony? THINK AGAIN, FRIEND.

### Configurable Max Retries
```json
{ "maxRetries": 3 }
```
Give your LLM 1 to 5 chances to get it right. Default is 2 because we believe in SECOND CHANCES but not INFINITE PATIENCE. After max retries, the message ships as-is -- because sometimes you gotta know when to fold 'em.

### Channel Targeting
```json
{ "channels": ["slack-main", "twitter-bot"] }
```
Only want to de-dash-ify specific channels? WE GOT YOU. Pass an array of channel IDs and deAIify will ONLY intercept messages in those channels. Leave it empty and it watches EVERYTHING. Like a hawk. A dash-hating hawk.

### Custom Correction Prompt
```json
{ "correctionPrompt": "No dashes. Period. Rewrite the whole thing." }
```
Don't like our default correction prompt? WRITE YOUR OWN. Make it stern. Make it gentle. Make it a haiku for all we care. The point is YOUR plugin, YOUR rules.

### Kill Switch
```json
{ "enabled": false }
```
Need to let a few dashes through for... reasons? Flip it off. Flip it back on. We don't judge.

---

## JUST 3 EASY STEPS!

**STEP 1:** Install it!
```bash
openclaw plugin install deaiify
```

**STEP 2:** There is no step 2! It works out of the box with zero configuration!

**STEP 3:** Okay fine, if you WANT to configure it:
```json
{
  "plugins": {
    "deaiify": {
      "enabled": true,
      "maxRetries": 2,
      "channels": [],
      "correctionPrompt": "Your previous response contained em-dashes or en-dashes. Rewrite it completely without any em-dashes or en-dashes. Restructure the sentences -- do not just swap in hyphens."
    }
  }
}
```

But you DON'T HAVE TO. Defaults are ALREADY PERFECT.

**ZERO external runtime dependencies.** Just a peer dependency on `@openclaw/plugin-sdk`. That's it. No bloat. No node_modules swamp. Just PURE, UNADULTERATED dash destruction.

---

## TESTIMONIALS*

> "I used to spend 3 hours a day manually removing em-dashes from my bot's output. Now I spend that time with my family."
> -- Definitely A Real Person

> "deAIify saved my marriage."
> -- Also Very Real

> "My engagement went up 400% after I stopped sounding like a Victorian telegraph operator."
> -- Absolutely Not Made Up

*\*These testimonials are as real as the em-dashes in your LLM output are necessary (they're not).*

---

## THE FINE PRINT

- Zero external runtime deps
- Peer dep on `@openclaw/plugin-sdk`
- TypeScript all the way down
- Two hooks, one mission
- Works with any OpenClaw-compatible agent

---

```
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║   STOP LIVING IN DASH HELL.                           ║
  ║                                                       ║
  ║   INSTALL deAIify TODAY AND NEVER SEE                 ║
  ║   AN EM-DASH AGAIN.*                                  ║
  ║                                                       ║
  ║   openclaw plugin install deaiify                     ║
  ║                                                       ║
  ║   *after max retries, results may vary.               ║
  ║    not responsible for existential crises caused by   ║
  ║    realizing how many dashes your LLM was using.      ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
```

---

*If you call in the next 15 minutes, we'll throw in a FREE dash counter that logs exactly how many dashes deAIify has intercepted. Just kidding, we didn't build that yet. But the plugin ACTUALLY WORKS and that's more than most infomercial products can say.*
