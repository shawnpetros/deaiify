# deAIify Plugin v2

## Architecture
- Single `before_agent_reply` hook
- Detection: U+2014 (em-dash) and U+2013 (en-dash) only. U+002D never touched.
- Rewrite via `api.runtime.agent.runEmbeddedAgent()` with 10s timeout
- Fail-open: original text delivered if rewrite fails
- Config via `api.pluginConfig`: `enabled` (boolean), `correctionPrompt` (string)

## Files
- `src/index.ts` — Plugin entry (definePluginEntry + hook)
- `src/detection.ts` — Dash detection utilities
- `tests/detection.test.ts` — Detection unit tests
- `openclaw.plugin.json` — Plugin manifest
- `package.json` — Package config with openclaw.extensions

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
- `event.cleanedBody` — the LLM reply text
- `ctx` — `PluginHookAgentContext` (runId, sessionKey, etc.)
- Return `{ handled: true, reply: { text: '...' } }` to replace
- Return `{ handled: false }` to pass through
