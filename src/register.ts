import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { CORRECTION_PROMPT } from "./constants.js";
import { containsDashes, verifyRewrite } from "./utils.js";

export type DeaiifyPluginConfig = {
  enabled?: boolean;
  rewriteTimeoutMs?: number | string;
};

export const DEFAULT_TIMEOUT_MS = 15000;

export function resolvePluginConfig(pluginConfig: unknown): DeaiifyPluginConfig {
  return pluginConfig && typeof pluginConfig === "object"
    ? (pluginConfig as DeaiifyPluginConfig)
    : {};
}

export function resolveRewriteTimeoutMs(pluginConfig: DeaiifyPluginConfig): number {
  const raw = pluginConfig.rewriteTimeoutMs;
  const parsed =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number.parseInt(raw, 10)
        : Number.NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

export function buildRewriteRunSuffix(): string {
  return `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
}

export type RegisterDeps = {
  resolvePreferredOpenClawTmpDir: () => string;
};

type HookHandler = (event: any, ctx: any) => any;

export interface PluginApi {
  pluginConfig?: unknown;
  config: unknown;
  logger: {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
  };
  runtime: {
    agent: {
      resolveAgentWorkspaceDir(config: unknown, agentId: string): string;
      resolveAgentDir(config: unknown, agentId: string): string;
      runEmbeddedPiAgent(opts: any): Promise<any>;
    };
  };
  on(event: "before_agent_reply" | "message_sending", handler: HookHandler): void;
}

export function registerHooks(api: PluginApi, deps: RegisterDeps): void {
  const pluginConfig = resolvePluginConfig(api.pluginConfig);

  // ── Hook 1: before_agent_reply (PRIMARY) ──────────────────────────────
  //
  // Fires after the LLM generates its reply, before delivery.
  // If banned dashes are detected (outside code blocks), calls
  // runEmbeddedPiAgent with a restructuring prompt.
  //
  // Fail-open: any error returns { handled: false } so the original
  // reply is still delivered unchanged.
  api.on("before_agent_reply", async (event, ctx) => {
    if (pluginConfig.enabled === false) {
      return { handled: false };
    }

    if (
      ctx.runId?.startsWith("deaiify-") ||
      ctx.sessionKey?.includes(":deaiify:")
    ) {
      return { handled: false };
    }

    const text = event.cleanedBody ?? "";
    if (!text || !containsDashes(text)) {
      return { handled: false };
    }

    api.logger.info("[deAIify] Banned dash detected. Rewriting via embedded agent.");

    const agentId = ctx.agentId?.trim() || "main";
    const workspaceDir = api.runtime.agent.resolveAgentWorkspaceDir(api.config, agentId);
    const agentDir = api.runtime.agent.resolveAgentDir(api.config, agentId);
    const runSuffix = buildRewriteRunSuffix();
    const runId = `deaiify-${runSuffix}`;
    const sessionFile = path.join(deps.resolvePreferredOpenClawTmpDir(), `deaiify-${runSuffix}.jsonl`);

    try {
      const result = await api.runtime.agent.runEmbeddedPiAgent({
        sessionId: runId,
        sessionKey: ctx.sessionKey ? `${ctx.sessionKey}:deaiify:${runSuffix}` : undefined,
        agentId,
        messageChannel: ctx.channelId,
        messageProvider: ctx.messageProvider,
        sessionFile,
        workspaceDir,
        agentDir,
        config: api.config,
        prompt: CORRECTION_PROMPT + text,
        provider: ctx.modelProviderId,
        model: ctx.modelId,
        timeoutMs: resolveRewriteTimeoutMs(pluginConfig),
        runId,
        trigger: "manual",
        disableMessageTool: true,
        disableTools: true,
        bootstrapContextMode: "lightweight",
        verboseLevel: "off",
        reasoningLevel: "off",
        silentExpected: true,
      });

      const rewritten = (result.payloads ?? [])
        .map((payload: { text?: string }) => payload.text ?? "")
        .filter(Boolean)
        .join("\n")
        .trim();

      if (!rewritten) {
        api.logger.warn("[deAIify] Embedded rewrite returned empty output. Delivering original.");
        return { handled: false };
      }

      if (containsDashes(rewritten)) {
        api.logger.warn("[deAIify] Rewrite still contained banned dashes. Delivering original.");
        return { handled: false };
      }

      if (!verifyRewrite(text, rewritten)) {
        api.logger.warn(
          "[deAIify] Rewrite failed verification gate (word count drift or length expansion out of range). " +
            "Delivering original reply unchanged."
        );
        return { handled: false };
      }

      api.logger.info("[deAIify] Rewrite accepted. Delivering rewritten reply.");
      return { handled: true, reply: { text: rewritten } };
    } catch (err) {
      api.logger.error(
        `[deAIify] Embedded rewrite failed: ${err instanceof Error ? err.message : String(err)}`
      );
      return { handled: false };
    } finally {
      await fs.unlink(sessionFile).catch(() => undefined);
    }
  });

  // ── Hook 2: message_sending (ABSOLUTE LAST-RESORT FALLBACK) ───────────
  //
  // This hook should almost never fire.
  // If it does, it means before_agent_reply was skipped or failed to handle.
  // Log a warning so we can diagnose the problem.
  // Apply minimal string cleanup so the user at least gets readable output.
  api.on("message_sending", (event, _ctx) => {
    if (pluginConfig.enabled === false) {
      return;
    }

    const text = event.content ?? "";
    if (!text || !containsDashes(text)) {
      return;
    }

    api.logger.warn(
      "[deAIify] WARNING: message_sending fallback fired. " +
        "This means before_agent_reply did not handle this message. " +
        "Check hook registration and plugin load order."
    );

    const cleaned = text
      .replace(/—/g, ", ")
      .replace(/–/g, "-");

    return { content: cleaned };
  });
}
