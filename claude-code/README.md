<p align="center">
  <img src="../assets/hero.png" alt="deAIify - SMASH AI PUNCTUATION! ONE SMALL CHANGE. HUGE IMPACT!" width="900" />
</p>

# deAIify for Claude Code

### A Stop hook that won't let Claude get away with it

---

## HI, BILLY MAYS HERE FOR deAIify on CLAUDE CODE!

ARE YOU TIRED of telling Claude "no em-dashes please" in CLAUDE.md for the FIFTEENTH TIME and watching it FORGET BY THE NEXT MESSAGE?

Does your AI write a beautiful response, slap a sneaky em-dash in there like a SECRET HANDSHAKE between LLMs, and then act SURPRISED when you call it out?

Have you ever begged Claude to rewrite, only to receive the SAME RESPONSE with ` -- ` substituted in like you wouldn't NOTICE THE SAME PUNCTUATION RHYTHM?

**Well BILLY MAYS HERE with deAIify for CLAUDE CODE!**

The ONLY Claude Code Stop hook that doesn't just NAG the model. No sir. deAIify intercepts the assistant's Stop event, scans the message, and if it finds a LONG LINE or TWO SHORT LINES, BLOCKS THE STOP COLD. Claude is forced to rewrite the message clean before the turn can end.

Like a disappointed parent returning a C-minus essay. "Do it again. DO IT RIGHT."

---

## ARE YOU TIRED OF...

...adding "NO EM-DASHES PLEASE" to your CLAUDE.md for the FIFTEENTH TIME and watching the model FORGET BY THE NEXT MESSAGE? Like a goldfish, but with a PhD?

...running `sed -i 's/long-line-character/-/g'` on every output, only to break a hyphen in a CLI flag and SHIP A BUSTED COMMAND TO PRODUCTION?

...telling Claude to rewrite, only for it to substitute ` -- ` like you wouldn't NOTICE THE SAME RHYTHM?

...running a SEPARATE Haiku pass to lint your output, paying for ANOTHER MODEL CALL on every reply, watching your token bill BALLOON?

...explaining "the autoregressive substrate keeps generating them anyway" to your CTO when they ask why your shipped README looks like a Dickens novel?

...building your OWN custom Claude Code wrapper just to scrub punctuation, maintaining FORK CONFLICTS with every release, while your real work piles up?

...spelunking through `~/.claude/projects/.../transcript.jsonl` with `jq` and `awk` because there's no other way to AUDIT what your agent has been writing?

**STOP. JUST. STOP.**

You don't need to nag CLAUDE.md. You don't need a second model. You don't need a custom wrapper. You don't need to spelunk through transcripts at midnight.

YOU NEED ONE STOP HOOK.

---

## JUST 2 EASY STEPS!

**STEP 1:** Clone and run the installer.

```bash
git clone https://github.com/shawnpetros/deaiify.git
cd deaiify/claude-code
./install.sh
```

**STEP 2:** There is no step 2! It's wired in!

The installer:
1. Copies `deaiify-stop.mjs` to `~/.claude/hooks/`
2. Patches `~/.claude/settings.json` to register the Stop hook
3. Prints a one-line success report

Idempotent. Re-running is safe. Requires `node` and `jq`.

If you prefer manual install, see `settings-snippet.json` and copy the hook by hand. We don't judge. (Yes we do.)

---

## WHAT DOES IT DO?

On every Claude Code Stop event, the hook scans the most recent assistant message for:

- **The em-dash (U+2014)** the long line itself, banned
- **The en-dash (U+2013)** the medium line, also banned
- **` -- ` in prose** the autoregressive em-dash substitute, surrounded by whitespace

Code fences and inline code are ignored, so `cmd --verbose` and friends are SAFE.

If any offender is found, the hook returns `{"decision": "block", "reason": "..."}`. Claude Code re-prompts the assistant with the reason as feedback. The assistant rewrites the message clean. The clean version lands in the transcript.

**Loop protection is built in.** If `stop_hook_active` is true on the second call, the hook passes through. No infinite loops.

**Fails open on any error.** If the hook crashes, the message ships unchanged. No stuck sessions. No drama.

---

## UNINSTALL

```bash
cd deaiify/claude-code
./uninstall.sh
```

Removes the hook file and the Stop hook entry from `settings.json`. Idempotent.

---

## SEE ALSO

For the original OpenClaw plugin version, see [the main README](../README.md).

ONE PRODUCT. TWO HARNESSES. ZERO DASHES.
