import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import { containsBannedDashes, countBannedDashes } from './detection.js';
import * as crypto from 'node:crypto';
import * as path from 'node:path';

const DEFAULT_CORRECTION_PROMPT =
  'The following text contains em-dashes or en-dashes. Rewrite it, replacing every em-dash and en-dash with " -- " (space-hyphen-hyphen-space). Do not change anything else. Do not restructure sentences. Do not add or remove words. Just swap the dashes.';

export default definePluginEntry({
  id: 'deaiify',
  name: 'deAIify',
  description: 'Intercepts LLM output and eliminates em-dashes via embedded rewrite',
  register(api) {
    api.registerHook('before_agent_reply', async (event, ctx) => {
      const config = api.pluginConfig as { enabled?: boolean; correctionPrompt?: string };

      // Disabled check
      if (config.enabled === false) {
        return { handled: false };
      }

      const { cleanedBody } = event;

      // Detection
      if (!containsBannedDashes(cleanedBody)) {
        return { handled: false };
      }

      const dashCount = countBannedDashes(cleanedBody);
      const prompt = config.correctionPrompt || DEFAULT_CORRECTION_PROMPT;

      // Attempt embedded rewrite (fail-open)
      try {
        const cfg = api.config;
        const agentDir = api.runtime.agent.resolveAgentDir(cfg);
        const workspaceDir = api.runtime.agent.resolveAgentWorkspaceDir(cfg);
        const sessionId = `deaiify:rewrite:${ctx.runId || crypto.randomUUID()}`;
        const sessionFile = path.join(agentDir, 'sessions', `deaiify-rewrite-${Date.now()}.jsonl`);

        const result = await api.runtime.agent.runEmbeddedAgent({
          sessionId,
          runId: crypto.randomUUID(),
          sessionFile,
          workspaceDir,
          prompt: `${prompt}\n\nText to sanitize:\n\n${cleanedBody}`,
          timeoutMs: 10_000,
        });

        // Extract the rewritten text from the agent result
        const sanitizedText = typeof result === 'string' ? result : (result as any)?.text ?? (result as any)?.content ?? cleanedBody;

        // Verify dashes were actually removed
        if (containsBannedDashes(sanitizedText)) {
          api.logger.warn('deAIify: rewrite still contains banned dashes, delivering original');
          return { handled: false };
        }

        api.logger.info(`deAIify: replaced ${dashCount} banned dash(es)`);

        return {
          handled: true,
          reply: { text: sanitizedText },
          reason: `replaced ${dashCount} em/en-dash(es)`,
        };
      } catch (err: unknown) {
        // Fail open: deliver original text
        const message = err instanceof Error ? err.message : String(err);
        api.logger.warn(`deAIify: rewrite failed, delivering original — ${message}`);
        return { handled: false };
      }
    });
  },
});
