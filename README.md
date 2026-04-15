# deAIify - The Em-Dash Slayer

> **ARE YOU TIRED of your LLM making your tweets look like a bot wrote them?**

Are you frustrated when your clean, human content gets ruined by those pesky em-dashes? Does your agent's output keep using "\u2014" when you want simple, readable prose?

**STOP THE EM-DASH MADNESS!**

## Meet deAIify

The ONLY OpenClaw plugin that systematically hunts down and eliminates em-dashes and en-dashes from your agent's output. Regex-first for speed, LLM fallback for edge cases, and fully configurable.

### **FEATURES:**

**PRECISION TARGETING** - Detects U+2014 (em-dash) and U+2013 (en-dash) with surgical accuracy. Hyphens? Untouched. Commas? Sacred.

**THREE MODES** - `auto` (regex-first, LLM fallback), `regex` (deterministic, zero LLM), `llm` (always rewrite). Pick your poison.

**VERIFIED OUTPUT** - LLM rewrites are checked against the original: word count drift and length expansion trigger rejection. No hallucinated text gets through.

**FAST AS BLINKING** - Regex handles 95% of cases with zero latency. LLM fallback has a 10-second timeout. Fail-open by design.

**ZERO DISK WRITES** - Ephemeral sessions only. Nothing written to disk. Scanner-friendly.

### **HOW IT WORKS:**

#### Auto mode (default)
1. Agent generates output with em-dashes
2. deAIify intercepts at `before_agent_reply` hook
3. Regex replaces dashes with " -- "
4. If regex result is clean: done, no LLM needed
5. If regex left whitespace artifacts: LLM cleans up, result verified before delivery

#### Regex mode
1. Agent generates output with em-dashes
2. Regex replaces all em/en-dashes with " -- "
3. Done. No LLM invoked, fully deterministic.

#### LLM mode
1. Agent generates output with em-dashes
2. Embedded LLM rewrites all dashes
3. Result verified (word count, length) before delivery

### **TECHNICAL SPECS:**

- **Plugin ID:** `deaiify`
- **Hook:** `before_agent_reply` (single hook, no bloat)
- **Detection Regex:** `/[\u2014\u2013]/`
- **Replacement Regex:** `/\s*[\u2014\u2013]\s*/g` -> ` -- `
- **Timeout:** 10 seconds (LLM path only)
- **Fail Mode:** Open (delivers original if rewrite fails or verification rejects)

### **INSTALLATION:**

```bash
# From ClawHub
clawhub install deaiify

# Or directly
openclaw plugins install shawnpetros/deaiify
```

### **CONFIGURATION:**

```json
{
  "id": "deaiify",
  "enabled": true,
  "mode": "auto",
  "correctionPrompt": "..."
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Toggle plugin on/off |
| `mode` | string | `"auto"` | `"auto"` (regex-first, LLM fallback), `"regex"` (deterministic), `"llm"` (always LLM) |
| `correctionPrompt` | string | (built-in) | Custom prompt for LLM rewrite |

### **WHAT IT DOESN'T DO:**

- **NOT** touch regular hyphens (U+002D)
- **NOT** restructure sentences
- **NOT** add or remove content
- **NOT** change any other punctuation
- **NOT** write anything to disk

### **THE BILLY MAYS PROMISE:**

"If your LLM's output is covered in em-dashes, IF it looks like it was written by a robot from 1995, THEN **deAIify** is the solution you've been waiting for! Don't let bot-formatted prose ruin your human-sounding content. Try deAIify today!"

### **CREDITS:**

- Built by: Shawn Petros
- For: OpenClaw plugin ecosystem
- License: MIT

---

**deAIify** - Because your agent should sound human, not like a punctuation enthusiast from the 19th century.
