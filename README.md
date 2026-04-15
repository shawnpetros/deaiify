# deAIify — The Em-Dash Slayer 🧹

> **ARE YOU TIRED of your LLM making your tweets look like a bot wrote them?**

Are you frustrated when your clean, human content gets ruined by those pesky em-dashes? Does your agent's output keep using "—” when you want simple, readable prose?

**STOP THE EM-DASH MADNESS!**

## Meet deAIify

The ONLY OpenClaw plugin that systematically hunts down and eliminates em-dashes and en-dashes from your agent's output. With a single click (well, install), it rewrites your LLM's prose into clean, professional, human-readable text.

### **FEATURES:**

🎯 **PRECISION TARGETING** - Detects U+2014 (em-dash —) and U+2013 (en-dash –) with surgical accuracy. Hyphens? Untouched. Commas? Sacred.

🤖 **EMBEDDED REWRITE ENGINE** - Uses embedded LLM rewriting to swap every banned dash for " -- " (space-hyphen-hyphen-space). No more broken syntax, no more bot-like formatting.

⚡ **FAST AS BLINKING** - 10-second timeout ensures your agent never gets delayed. If rewrite fails? It delivers your original text. Fail-open by design.

🔧 **ZERO CONFIG** - Just install and go. Enable/disable with a toggle. Custom prompts available if you're feeling spicy.

### **HOW IT WORKS:**

1. Agent generates output with em-dashes
2. deAIify intercepts at `before_agent_reply` hook
3. Embedded LLM rewrites dashes to " -- "
4. Sanitized text delivered to user
5. You feel like a wordsmith, not a bot

### **TECHNICAL SPECS:**

- **Plugin ID:** `deaiify`
- **Hook:** `before_agent_reply` (single hook, no bloat)
- **Detection Regex:** `/[\u2014\u2013]/`
- **Replacement:** ` -- ` (space-hyphen-hyphen-space)
- **Timeout:** 10 seconds
- **Retry Policy:** 1 retry max
- **Fail Mode:** Open (delivers original if rewrite fails)
- **Config:** `enabled` (boolean), `correctionPrompt` (string)

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
  "correctionPrompt": "The following text contains em-dashes or en-dashes. Rewrite it, replacing every em-dash and en-dash with \" -- \" (space-hyphen-hyphen-space). Do not change anything else."
}
```

### **WHAT IT DOESN'T DO:**

❌ **NOT** touch regular hyphens (U+002D)
❌ **NOT** restructure sentences
❌ **NOT** add or remove content
❌ **NOT** change any other punctuation

### **THE BILLY MAYS PROMISE:**

"If your LLM's output is covered in em-dashes, IF it looks like it was written by a robot from 1995, THEN **deAIify** is the solution you've been waiting for! Don't let bot-formatted prose ruin your human-sounding content. Try deAIify today!"

### **CREDITS:**

- Built by: Shawn Petros
- For: OpenClaw plugin ecosystem
- License: MIT

---

**deAIify** — Because your agent should sound human, not like a punctuation enthusiast from the 19th century.
