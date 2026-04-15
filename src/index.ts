import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import {
  containsBannedDashes,
  countBannedDashes,
  regexReplaceDashes,
  hasWhitespaceIssues,
  verifyRewrite,
} from './detection.js';
import * as crypto from 'node:crypto';

export type DeaiifyMode = 'auto' | 'regex' | 'llm';

interface DeaiifyConfig {
  enabled?: boolean;
  mode?: DeaiifyMode;
  correctionPrompt?: string;
}

const DEFAULT_CORRECTION_PROMPT =
  'The following text contains em-dashes or en-dashes. Rewrite it, replacing every em-dash and en-dash with " -- " (space-hyphen-hyphen-space). Do not change anything else. Do not restructure sentences. Do not add or remove words. Just swap the dashes.';

export default definePluginEntry({
  id: 'deaiify',
  name: 'deAIify',
  description: 'Intercepts LLM output and eliminates em-dashes via regex-first rewrite with optional LLM fallback',
  register(api) {
    api.registerHook('before_agent_reply', async (event, ctx) => {
      const config = api.pluginConfig as DeaiifyConfig;

      if (config.enabled === false) {
        return { handled: false };
      }

      const { cleanedBody } = event;

      if (!containsBannedDashes(cleanedBody)) {
        return { handled: false };
      }

      const dashCount = countBannedDashes(cleanedBody);
      const mode: DeaiifyMode = config.mode ?? 'auto';

      // Regex path (used by 'regex' and 'auto' modes)
      if (mode === 'regex' || mode === 'auto') {
        const regexResult = regexReplaceDashes(cleanedBody);

        if (mode === 'regex' || !hasWhitespaceIssues(regexResult)) {
          api.logger.info(`deAIify: replaced ${dashCount} banned dash(es) via regex`);
          return {
            handled: true,
            reply: { text: regexResult },
            reason: `replaced ${dashCount} em/en-dash(es) via regex`,
          };
        }

        api.logger.info('deAIify: regex produced whitespace artifacts, falling back to LLM');
      }

      // LLM path (used by 'llm' mode and 'auto' fallback)
      try {
        const cfg = api.config;
        const workspaceDir = api.runtime.agent.resolveAgentWorkspaceDir(cfg);
        const sessionId = `deaiify:rewrite:${ctx.runId || crypto.randomUUID()}`;
        const prompt = config.correctionPrompt || DEFAULT_CORRECTION_PROMPT;

        const result = await api.runtime.agent.runEmbeddedAgent({
          sessionId,
          runId: crypto.randomUUID(),
          workspaceDir,
          prompt: `${prompt}\n\nText to sanitize:\n\n${cleanedBody}`,
          timeoutMs: 10_000,
        });

        const sanitizedText =
          typeof result === 'string'
            ? result
            : (result as any)?.text ?? (result as any)?.content ?? cleanedBody;

        if (!verifyRewrite(cleanedBody, sanitizedText)) {
          api.logger.warn('deAIify: LLM rewrite failed verification, delivering original');
          return { handled: false };
        }

        api.logger.info(`deAIify: replaced ${dashCount} banned dash(es) via LLM`);

        return {
          handled: true,
          reply: { text: sanitizedText },
          reason: `replaced ${dashCount} em/en-dash(es) via LLM`,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        api.logger.warn(`deAIify: rewrite failed, delivering original - ${message}`);
        return { handled: false };
      }
    });
  },
});
