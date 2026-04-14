# deAIify

## Purpose
OpenClaw plugin that intercepts outbound assistant messages containing em-dashes (U+2014) or en-dashes (U+2013) and requests an LLM rewrite without them. Two-hook architecture: `message_sending` cancels delivery, `before_agent_reply` injects correction prompt.

## Vault Sync
Search terms: `deaiify`, `openclaw plugin`, `em-dash`, `dash detection`

## Feature Tracker
See `features.json` for structured phase/feature tracking.

## Tech Stack
- TypeScript, no runtime deps
- Peer dep: `@openclaw/plugin-sdk`
- Build: `tsc`

## Conventions
- All hook logic lives in `src/hooks/` with thin wrappers in `src/index.ts`
- Shared constants in `src/constants.ts`, types in `src/types.ts`
