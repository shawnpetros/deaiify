import { describe, it, expect, vi, beforeEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import {
  DEFAULT_TIMEOUT_MS,
  buildRewriteRunSuffix,
  registerHooks,
  resolvePluginConfig,
  resolveRewriteTimeoutMs,
} from "../register.js";

// ── Pure helper tests ──────────────────────────────────────────────────────

describe("resolvePluginConfig", () => {
  it("returns the object when given an object", () => {
    const cfg = { enabled: true };
    expect(resolvePluginConfig(cfg)).toBe(cfg);
  });

  it("returns empty object when given null", () => {
    expect(resolvePluginConfig(null)).toEqual({});
  });

  it("returns empty object when given undefined", () => {
    expect(resolvePluginConfig(undefined)).toEqual({});
  });

  it("returns empty object when given a primitive", () => {
    expect(resolvePluginConfig(42)).toEqual({});
    expect(resolvePluginConfig("hello")).toEqual({});
    expect(resolvePluginConfig(true)).toEqual({});
  });
});

describe("resolveRewriteTimeoutMs", () => {
  it("returns the default when no timeout is set", () => {
    expect(resolveRewriteTimeoutMs({})).toBe(DEFAULT_TIMEOUT_MS);
  });

  it("returns a positive number unchanged", () => {
    expect(resolveRewriteTimeoutMs({ rewriteTimeoutMs: 5000 })).toBe(5000);
  });

  it("parses a numeric string", () => {
    expect(resolveRewriteTimeoutMs({ rewriteTimeoutMs: "7500" })).toBe(7500);
  });

  it("falls back to default for zero", () => {
    expect(resolveRewriteTimeoutMs({ rewriteTimeoutMs: 0 })).toBe(DEFAULT_TIMEOUT_MS);
  });

  it("falls back to default for negative values", () => {
    expect(resolveRewriteTimeoutMs({ rewriteTimeoutMs: -100 })).toBe(DEFAULT_TIMEOUT_MS);
  });

  it("falls back to default for NaN strings", () => {
    expect(resolveRewriteTimeoutMs({ rewriteTimeoutMs: "abc" })).toBe(DEFAULT_TIMEOUT_MS);
  });

  it("falls back to default for empty string", () => {
    expect(resolveRewriteTimeoutMs({ rewriteTimeoutMs: "" })).toBe(DEFAULT_TIMEOUT_MS);
  });
});

describe("buildRewriteRunSuffix", () => {
  it("returns a string with the timestamp-uuid shape", () => {
    const suffix = buildRewriteRunSuffix();
    expect(suffix).toMatch(/^[0-9a-z]+-[0-9a-f]{8}$/);
  });

  it("returns different suffixes on each call", () => {
    const a = buildRewriteRunSuffix();
    const b = buildRewriteRunSuffix();
    expect(a).not.toBe(b);
  });
});

// ── Test harness ───────────────────────────────────────────────────────────

type Handler = (event: any, ctx: any) => any;

function buildFakeApi(opts: {
  pluginConfig?: unknown;
  runEmbeddedPiAgent?: (opts: any) => Promise<any>;
} = {}) {
  const handlers = new Map<string, Handler>();
  const lastEmbeddedAgentArgs: { value: any } = { value: undefined };
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const runEmbeddedPiAgent = vi.fn(async (args: any) => {
    lastEmbeddedAgentArgs.value = args;
    if (opts.runEmbeddedPiAgent) {
      return opts.runEmbeddedPiAgent(args);
    }
    return { payloads: [] };
  });
  const api = {
    pluginConfig: opts.pluginConfig,
    config: { configKey: "configValue" },
    logger,
    runtime: {
      agent: {
        resolveAgentWorkspaceDir: vi.fn(
          (_cfg: unknown, agentId: string) => `/fake/workspace/${agentId}`
        ),
        resolveAgentDir: vi.fn(
          (_cfg: unknown, agentId: string) => `/fake/agentdir/${agentId}`
        ),
        runEmbeddedPiAgent,
      },
    },
    on(event: string, handler: Handler) {
      handlers.set(event, handler);
    },
  };
  return { api, handlers, logger, runEmbeddedPiAgent, lastEmbeddedAgentArgs };
}

const tmpDir = os.tmpdir();
const deps = {
  resolvePreferredOpenClawTmpDir: () => tmpDir,
};

// ── Hook registration ─────────────────────────────────────────────────────

describe("registerHooks: registration", () => {
  it("registers both before_agent_reply and message_sending", () => {
    const { api, handlers } = buildFakeApi();
    registerHooks(api as never, deps);
    expect(handlers.has("before_agent_reply")).toBe(true);
    expect(handlers.has("message_sending")).toBe(true);
  });
});

// ── before_agent_reply behavior ───────────────────────────────────────────

describe("before_agent_reply", () => {
  it("returns handled:false when plugin is disabled", async () => {
    const { api, handlers, runEmbeddedPiAgent } = buildFakeApi({
      pluginConfig: { enabled: false },
    });
    registerHooks(api as never, deps);
    const result = await handlers.get("before_agent_reply")!(
      { cleanedBody: "this has an em—dash" },
      {}
    );
    expect(result).toEqual({ handled: false });
    expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
  });

  it("returns handled:false when ctx.runId starts with deaiify- (recursion guard)", async () => {
    const { api, handlers, runEmbeddedPiAgent } = buildFakeApi();
    registerHooks(api as never, deps);
    const result = await handlers.get("before_agent_reply")!(
      { cleanedBody: "em—dash here" },
      { runId: "deaiify-abc123" }
    );
    expect(result).toEqual({ handled: false });
    expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
  });

  it("returns handled:false when ctx.sessionKey contains :deaiify: (recursion guard)", async () => {
    const { api, handlers, runEmbeddedPiAgent } = buildFakeApi();
    registerHooks(api as never, deps);
    const result = await handlers.get("before_agent_reply")!(
      { cleanedBody: "em—dash" },
      { sessionKey: "session-1:deaiify:rewrite-attempt" }
    );
    expect(result).toEqual({ handled: false });
    expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
  });

  it("returns handled:false when cleanedBody is missing", async () => {
    const { api, handlers, runEmbeddedPiAgent } = buildFakeApi();
    registerHooks(api as never, deps);
    const result = await handlers.get("before_agent_reply")!({}, {});
    expect(result).toEqual({ handled: false });
    expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
  });

  it("returns handled:false when text has no dashes", async () => {
    const { api, handlers, runEmbeddedPiAgent } = buildFakeApi();
    registerHooks(api as never, deps);
    const result = await handlers.get("before_agent_reply")!(
      { cleanedBody: "perfectly fine text" },
      {}
    );
    expect(result).toEqual({ handled: false });
    expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
  });

  it("returns handled:false when dashes are only inside fenced code blocks", async () => {
    const { api, handlers, runEmbeddedPiAgent } = buildFakeApi();
    registerHooks(api as never, deps);
    const result = await handlers.get("before_agent_reply")!(
      { cleanedBody: "Pure prose.\n```\nconst x = a—b;\n```\nMore prose." },
      {}
    );
    expect(result).toEqual({ handled: false });
    expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
  });

  it("calls runEmbeddedPiAgent with the correct shape on a valid rewrite", async () => {
    const original = "The plan — surprisingly — worked out well for us.";
    const rewritten = "Surprisingly, the plan worked out quite well for us.";
    const { api, handlers, runEmbeddedPiAgent, lastEmbeddedAgentArgs } =
      buildFakeApi({
        pluginConfig: { rewriteTimeoutMs: 9999 },
        runEmbeddedPiAgent: async () => ({ payloads: [{ text: rewritten }] }),
      });
    registerHooks(api as never, deps);
    const result = await handlers.get("before_agent_reply")!(
      { cleanedBody: original },
      {
        agentId: "  custom-agent  ",
        sessionKey: "sess-1",
        channelId: "chan-1",
        messageProvider: "slack",
        modelProviderId: "anthropic",
        modelId: "claude",
      }
    );

    expect(result).toEqual({ handled: true, reply: { text: rewritten } });
    expect(runEmbeddedPiAgent).toHaveBeenCalledOnce();

    const args = lastEmbeddedAgentArgs.value;
    expect(args.agentId).toBe("custom-agent");
    expect(args.workspaceDir).toBe("/fake/workspace/custom-agent");
    expect(args.agentDir).toBe("/fake/agentdir/custom-agent");
    expect(args.runId).toMatch(/^deaiify-[0-9a-z]+-[0-9a-f]{8}$/);
    expect(args.sessionId).toBe(args.runId);
    expect(args.sessionKey).toMatch(/^sess-1:deaiify:[0-9a-z]+-[0-9a-f]{8}$/);
    expect(args.sessionFile.startsWith(tmpDir)).toBe(true);
    expect(args.sessionFile.endsWith(".jsonl")).toBe(true);
    expect(args.prompt.endsWith(original)).toBe(true);
    expect(args.timeoutMs).toBe(9999);
    expect(args.provider).toBe("anthropic");
    expect(args.model).toBe("claude");
    expect(args.messageChannel).toBe("chan-1");
    expect(args.messageProvider).toBe("slack");
    expect(args.disableMessageTool).toBe(true);
    expect(args.disableTools).toBe(true);
    expect(args.bootstrapContextMode).toBe("lightweight");
    expect(args.verboseLevel).toBe("off");
    expect(args.reasoningLevel).toBe("off");
    expect(args.silentExpected).toBe(true);
    expect(args.trigger).toBe("manual");
    expect(args.config).toEqual({ configKey: "configValue" });
  });

  it("uses 'main' as the agentId when ctx.agentId is missing", async () => {
    const { api, handlers, lastEmbeddedAgentArgs } = buildFakeApi({
      runEmbeddedPiAgent: async () => ({ payloads: [{ text: "Clean rewrite here." }] }),
    });
    registerHooks(api as never, deps);
    await handlers.get("before_agent_reply")!(
      { cleanedBody: "A short—sentence here." },
      {}
    );
    expect(lastEmbeddedAgentArgs.value.agentId).toBe("main");
    expect(lastEmbeddedAgentArgs.value.workspaceDir).toBe("/fake/workspace/main");
  });

  it("uses 'main' when ctx.agentId is only whitespace", async () => {
    const { api, handlers, lastEmbeddedAgentArgs } = buildFakeApi({
      runEmbeddedPiAgent: async () => ({ payloads: [{ text: "Clean rewrite here." }] }),
    });
    registerHooks(api as never, deps);
    await handlers.get("before_agent_reply")!(
      { cleanedBody: "A short—sentence here." },
      { agentId: "   " }
    );
    expect(lastEmbeddedAgentArgs.value.agentId).toBe("main");
  });

  it("leaves sessionKey undefined when ctx.sessionKey is absent", async () => {
    const { api, handlers, lastEmbeddedAgentArgs } = buildFakeApi({
      runEmbeddedPiAgent: async () => ({ payloads: [{ text: "Clean rewrite here." }] }),
    });
    registerHooks(api as never, deps);
    await handlers.get("before_agent_reply")!(
      { cleanedBody: "A short—sentence here." },
      {}
    );
    expect(lastEmbeddedAgentArgs.value.sessionKey).toBeUndefined();
  });

  it("joins multi-payload responses with newline before trimming", async () => {
    // Original must contain a dash to enter the rewrite path. Joined text
    // must pass the verification gate (word drift <=10%, length expansion
    // <=50%) and must not itself contain a banned dash. Word counts are
    // matched precisely (10 split-tokens each) so drift is 0.
    const original = "a—b c d e f g h i j k"; // 10 split-tokens, has em-dash
    const part1 = "x y z w v"; // 5 tokens
    const part2 = "u t s r q"; // 5 tokens
    const { api, handlers } = buildFakeApi({
      runEmbeddedPiAgent: async () => ({
        payloads: [{ text: part1 }, { text: part2 }],
      }),
    });
    registerHooks(api as never, deps);
    const result = await handlers.get("before_agent_reply")!(
      { cleanedBody: original },
      {}
    );
    expect(result.handled).toBe(true);
    expect(result.reply.text).toBe(`${part1}\n${part2}`);
  });

  it("fails open when rewrite still contains a banned dash", async () => {
    const { api, handlers, logger } = buildFakeApi({
      runEmbeddedPiAgent: async () => ({
        payloads: [{ text: "Replacement still has—a dash." }],
      }),
    });
    registerHooks(api as never, deps);
    const result = await handlers.get("before_agent_reply")!(
      { cleanedBody: "original—text" },
      {}
    );
    expect(result).toEqual({ handled: false });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Rewrite still contained banned dashes")
    );
  });

  it("fails open when rewrite fails the verification gate", async () => {
    const original = "Short.—";
    const bloated =
      "This is a much, much, much, much, much, much longer rewrite that adds enormous content.";
    const { api, handlers, logger } = buildFakeApi({
      runEmbeddedPiAgent: async () => ({ payloads: [{ text: bloated }] }),
    });
    registerHooks(api as never, deps);
    const result = await handlers.get("before_agent_reply")!(
      { cleanedBody: original },
      {}
    );
    expect(result).toEqual({ handled: false });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("failed verification gate")
    );
  });

  it("fails open when rewrite is empty", async () => {
    const { api, handlers, logger } = buildFakeApi({
      runEmbeddedPiAgent: async () => ({ payloads: [{ text: "" }] }),
    });
    registerHooks(api as never, deps);
    const result = await handlers.get("before_agent_reply")!(
      { cleanedBody: "original—text" },
      {}
    );
    expect(result).toEqual({ handled: false });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("empty output")
    );
  });

  it("fails open when payloads is missing entirely", async () => {
    const { api, handlers } = buildFakeApi({
      runEmbeddedPiAgent: async () => ({}),
    });
    registerHooks(api as never, deps);
    const result = await handlers.get("before_agent_reply")!(
      { cleanedBody: "original—text" },
      {}
    );
    expect(result).toEqual({ handled: false });
  });

  it("fails open when runEmbeddedPiAgent throws", async () => {
    const { api, handlers, logger } = buildFakeApi({
      runEmbeddedPiAgent: async () => {
        throw new Error("LLM timeout");
      },
    });
    registerHooks(api as never, deps);
    const result = await handlers.get("before_agent_reply")!(
      { cleanedBody: "original—text" },
      {}
    );
    expect(result).toEqual({ handled: false });
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("LLM timeout")
    );
  });

  it("attempts to clean up the session file in finally", async () => {
    const fakeTmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "deaiify-test-"));
    // Pre-create a file matching the expected pattern so we can confirm unlink.
    // Since we don't know the suffix in advance, we capture it from the
    // runEmbeddedPiAgent args and create the file on the fly.
    const { api, handlers, lastEmbeddedAgentArgs } = buildFakeApi({
      runEmbeddedPiAgent: async (args: any) => {
        await fs.writeFile(args.sessionFile, "test-content", "utf8");
        return { payloads: [{ text: "Clean rewrite here." }] };
      },
    });
    registerHooks(api as never, { resolvePreferredOpenClawTmpDir: () => fakeTmpDir });
    await handlers.get("before_agent_reply")!(
      { cleanedBody: "A short—sentence here." },
      {}
    );
    const sessionFile = lastEmbeddedAgentArgs.value.sessionFile;
    await expect(fs.access(sessionFile)).rejects.toThrow();
    await fs.rm(fakeTmpDir, { recursive: true, force: true });
  });

  it("swallows ENOENT when session file does not exist (finally cleanup)", async () => {
    // runEmbeddedPiAgent does not create the file -> unlink will fail
    // silently and the handler should still return cleanly.
    const { api, handlers } = buildFakeApi({
      runEmbeddedPiAgent: async () => ({ payloads: [{ text: "Clean rewrite here." }] }),
    });
    registerHooks(api as never, deps);
    const result = await handlers.get("before_agent_reply")!(
      { cleanedBody: "A short—sentence here." },
      {}
    );
    expect(result.handled).toBe(true);
  });
});

// ── message_sending fallback ──────────────────────────────────────────────

describe("message_sending fallback", () => {
  it("returns undefined (no override) when plugin is disabled", () => {
    const { api, handlers } = buildFakeApi({ pluginConfig: { enabled: false } });
    registerHooks(api as never, deps);
    const result = handlers.get("message_sending")!(
      { content: "text—with dashes" },
      {}
    );
    expect(result).toBeUndefined();
  });

  it("returns undefined when content is missing", () => {
    const { api, handlers } = buildFakeApi();
    registerHooks(api as never, deps);
    const result = handlers.get("message_sending")!({}, {});
    expect(result).toBeUndefined();
  });

  it("returns undefined when content has no dashes", () => {
    const { api, handlers } = buildFakeApi();
    registerHooks(api as never, deps);
    const result = handlers.get("message_sending")!(
      { content: "perfectly clean prose" },
      {}
    );
    expect(result).toBeUndefined();
  });

  it("returns undefined when dashes are only inside code blocks", () => {
    const { api, handlers } = buildFakeApi();
    registerHooks(api as never, deps);
    const result = handlers.get("message_sending")!(
      { content: "Prose.\n```\nconst x = a—b;\n```\nMore." },
      {}
    );
    expect(result).toBeUndefined();
  });

  it("replaces em-dashes with comma+space and en-dashes with hyphen", () => {
    const { api, handlers, logger } = buildFakeApi();
    registerHooks(api as never, deps);
    const result = handlers.get("message_sending")!(
      { content: "alpha—beta and pages 12–15" },
      {}
    );
    expect(result).toEqual({ content: "alpha, beta and pages 12-15" });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("message_sending fallback fired")
    );
  });

  it("replaces dashes inside code blocks too (known code-fence-blind behavior)", () => {
    // The fallback is intentionally code-fence-blind: by the time it runs
    // we are out of options and any string cleanup is better than shipping
    // the offending characters. Pinning this so any future refactor of the
    // fallback is a deliberate decision.
    const { api, handlers } = buildFakeApi();
    registerHooks(api as never, deps);
    const result = handlers.get("message_sending")!(
      { content: "prose—here ```\ncode—with dash\n```" },
      {}
    );
    expect(result?.content).toContain("prose, here");
    expect(result?.content).toContain("code, with dash");
    expect(result?.content).not.toMatch(/[–—]/);
  });
});
