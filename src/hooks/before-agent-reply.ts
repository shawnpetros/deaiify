import type { DeAIifyConfig, DeAIifyState } from "../types.js";

export function beforeAgentReply(
  config: DeAIifyConfig,
  state: DeAIifyState,
  inject: (message: { role: "user"; content: string }) => void
) {
  if (!state.pendingCorrection) {
    return;
  }

  state.pendingCorrection = false;

  inject({
    role: "user",
    content: config.correctionPrompt,
  });

  console.log(
    `[deAIify] Injected correction prompt (attempt ${state.retryCount})`
  );
}
