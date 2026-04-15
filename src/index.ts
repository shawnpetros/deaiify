import { definePluginEntry } from "@openclaw/plugin-sdk/core.js";
import { CORRECTION_PROMPT } from "./constants.js";
import { containsDashes, verifyRewrite } from "./utils.js";

export default definePluginEntry({
  id: "deaiify",
  name: "deAIify",
  description:
    "Intercepts em-dashes and en-dashes in outbound replies. " +
    "Rewrites via embedded LLM so sentences are properly restructured, not just character-swapped.",

  register(api) {
    // ── Hook 1: before_agent_reply (PRIMARY) ──────────────────────────────
    //
    // Fires after the LLM generates its reply, before delivery.
    // If banned dashes are detected (outside code blocks), calls
    // runEmbeddedPiAgent with a restructuring prompt.
    //
    // Fail-open: any error returns { handled: false } so the original
    // reply is still delivered unchanged.
    api.on("before_agent_reply", async (event: any, ctx: any) => {
      const text: string = event.cleanedBody ?? "";
      if (!text || !containsDashes(text)) {
        return { handled: false };
      }

      console.log(
        "[deAIify] Banned dash detected in reply. Calling embedded LLM for restructured rewrite..."
      );

      try {
        const runtime = (api as any).runtime;
        const timeoutMs: number =
          (api as any).config?.rewriteTimeoutMs ?? 15000;

        const result = await runtime.agent.runEmbeddedPiAgent({
          sessionId: ctx.sessionId ?? `deaiify_${Date.now()}`,
          workspaceDir:
            runtime.workspaceDir ??
            `${process.env.HOME ?? "/tmp"}/.openclaw/workspace`,
          prompt: CORRECTION_PROMPT + text,
          timeoutMs,
          runId: `deaiify_${Date.now()}`,
          trigger: "manual",
          disableMessageTool: true,
        });

        const payloads: any[] = result?.payloads ?? [];
        const rewritten = payloads
          .map((p: any) => p?.text ?? "")
          .filter(Boolean)
          .join("")
          .trim();

        if (!rewritten) {
          console.warn("[deAIify] LLM returned empty rewrite. Falling through.");
          return { handled: false };
        }

        if (!verifyRewrite(text, rewritten)) {
          console.warn(
            "[deAIify] Rewrite failed verification gate (word count drift or length expansion out of range). " +
              "Delivering original reply unchanged."
          );
          return { handled: false };
        }

        console.log("[deAIify] Rewrite accepted. Delivering restructured reply.");
        return { handled: true, reply: { text: rewritten } };
      } catch (err) {
        console.error("[deAIify] Embedded rewrite threw an error:", err);
        // Fail-open: deliver original unchanged
        return { handled: false };
      }
    });

    // ── Hook 2: message_sending (ABSOLUTE LAST-RESORT FALLBACK) ───────────
    //
    // This hook should almost never fire.
    // If it does, it means before_agent_reply was skipped or failed to handle.
    // Log a warning so we can diagnose the problem.
    // Apply minimal string cleanup so the user at least gets readable output.
    api.on("message_sending", (event: any, _ctx: any) => {
      const text: string = event.content ?? "";
      if (!text || !containsDashes(text)) {
        return;
      }

      console.warn(
        "[deAIify] WARNING: message_sending fallback fired. " +
          "This means before_agent_reply did not handle this message. " +
          "Check hook registration and plugin load order."
      );

      const cleaned = text
        .replace(/\u2014/g, ", ") // em-dash -> comma space
        .replace(/\u2013/g, "-"); // en-dash -> hyphen

      return { content: cleaned };
    });
  },
});
