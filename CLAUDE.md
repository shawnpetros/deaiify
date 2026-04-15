# deAIify Plugin v2.2

## Architecture
- Single `before_agent_reply` hook
- Detection: U+2014 (em-dash) and U+2013 (en-dash) only. U+002D never touched.
- Three modes: `auto` (default), `regex`, `llm`
  - `auto`: regex-first, LLM fallback only when regex produces whitespace artifacts
  - `regex`: deterministic replacement only, no LLM invocation
  - `llm`: always uses embedded agent rewrite (original v2 behavior)
- Regex: `/\s*[\u2014\u2013]\s*/g` replaced with ` -- `
- LLM rewrite via `api.runtime.agent.runEmbeddedAgent()` with 10s timeout, ephemeral session (no sessionFile)
- Verification: LLM output checked for word-count drift (>10% rejected) and length expansion (>50% rejected)
- Fail-open: original text delivered if rewrite fails or verification rejects

## Files
- `src/index.ts` - Plugin entry (definePluginEntry + hook, mode routing)
- `src/detection.ts` - Dash detection, regex replacement, whitespace check, verification
- `tests/detection.test.ts` - Detection + replacement + verification unit tests
- `openclaw.plugin.json` - Plugin manifest with scanner metadata
- `package.json` - Package config with openclaw.extensions

## SDK Pattern
```typescript
import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';

export default definePluginEntry({
  id: 'deaiify',
  register(api) {
    api.registerHook('before_agent_reply', async (event, ctx) => { ... });
  }
});
```

## Hook contract
- `event.cleanedBody` - the LLM reply text
- `ctx` - `PluginHookAgentContext` (runId, sessionKey, etc.)
- Return `{ handled: true, reply: { text: '...' } }` to replace
- Return `{ handled: false }` to pass through

## Config
- `enabled` (boolean, default: true) - toggle plugin on/off
- `mode` ('auto' | 'regex' | 'llm', default: 'auto') - rewrite strategy
- `correctionPrompt` (string) - custom LLM rewrite prompt
