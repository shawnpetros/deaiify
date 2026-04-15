# deAIify

**Ban LLM tells. Make text sound human.**

## What it does

Em-dashes (\u2014) and en-dashes (\u2013) are the loudest tells that text was LLM-generated.
deAIify bans both, and when it catches them, it does something smarter than string replacement:
it sends the reply back to the LLM with a restructuring prompt and delivers the properly rewritten version.

No character swaps. No "comma where an em-dash was." Actual sentences that read like a human wrote them.

## Architecture: v3 LLM-first rewrite

**v1 was wrong:** string replacement swaps characters but leaves broken grammar.
Example: "Things like this -- might result in" becomes "Things like this. might result in" (lowercase m after period, broken).

**v2 introduced LLM rewrite** but kept a regex-first mode that caused the same problem.

**v3 is correct:**

1. `before_agent_reply` intercepts the completed assistant text before delivery
2. Detects banned dash characters (U+2013, U+2014) outside of code blocks
3. Calls `runEmbeddedPiAgent` with a restructuring prompt
4. Verifies the rewrite is sane (word count and length checks)
5. Returns the rewritten reply

The `message_sending` hook exists only as an absolute last-resort fallback. If it fires, something is wrong with hook registration and it logs a warning.

## How it works

When the LLM generates a response containing any banned dash:

1. `before_agent_reply` catches it
2. A restructuring prompt goes to the LLM: "Eliminate these dashes. Rephrase so the sentence flows without them."
3. The LLM produces a new version with natural phrasing
4. A verification gate checks the rewrite did not balloon in length or word count
5. The properly restructured version is delivered

On any error (LLM timeout, empty response, verification failure), the plugin fails open and delivers the original reply unchanged. No crashes. No stuck sessions.

## Installation

```bash
openclaw plugin install deaiify
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `rewriteTimeoutMs` | integer | `15000` | Timeout in ms for the embedded rewrite call |

The plugin uses the session's default model for rewrites. No model config needed.

Example plugin config:
```json
{
  "rewriteTimeoutMs": 20000
}
```

## Detection

Only two patterns are detected:

- `\u2014` -- Unicode em-dash (U+2014)
- `\u2013` -- Unicode en-dash (U+2013)

Hyphen-minus (U+002D, the regular `-` character) is NEVER touched.
Double-hyphens (`--`) in output are fine and expected.

Content inside fenced code blocks (` ``` `) and inline code (`` ` ``) is excluded from detection.
Code samples that happen to contain Unicode dashes are left alone.

## Verification gate

The rewrite is rejected (and the original delivered unchanged) if:

- Word count drifts more than 10% from the original
- Total length expands more than 50% over the original

The LLM is restructuring, not adding content. If it bloats the response, something went wrong.

## Security and privacy

- No message content is stored to disk. Rewrite prompts are ephemeral and scoped to the current session.
- Embedded LLM rewrite uses the session-default model. No external API calls.
- Fail-open design: every error path delivers the original reply unchanged.
- Single hook path. No config-driven code execution.

## Philosophy

"Boil the Ocean": the marginal cost of completeness is near zero with AI. Do the whole thing, with tests, with docs, to the standard of "holy shit, that's done."

deAIify is not about finding the most common pattern. It is about delivering clean, human-sounding prose every time, restructured properly at the sentence level, not patched with character substitutions.

## License

MIT
