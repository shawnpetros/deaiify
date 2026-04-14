import { DASH_PATTERN } from "../constants.js";
import type { DeAIifyConfig, DeAIifyState } from "../types.js";

export function messageSending(
  message: { text?: string },
  config: DeAIifyConfig,
  state: DeAIifyState,
  context: { channelId?: string }
) {
  if (!config.enabled) {
    return { cancel: false };
  }

  if (config.channels.length > 0 && context.channelId && !config.channels.includes(context.channelId)) {
    return { cancel: false };
  }

  if (state.retryCount >= config.maxRetries) {
    console.warn(
      `[deAIify] Max retries (${config.maxRetries}) reached. Shipping as-is.`
    );
    state.retryCount = 0;
    state.pendingCorrection = false;
    return { cancel: false };
  }

  if (!message.text) {
    return { cancel: false };
  }

  if (!DASH_PATTERN.test(message.text)) {
    state.retryCount = 0;
    state.pendingCorrection = false;
    return { cancel: false };
  }

  state.retryCount++;
  state.pendingCorrection = true;
  console.log(
    `[deAIify] Intercepted message with dashes (attempt ${state.retryCount}/${config.maxRetries})`
  );
  return { cancel: true };
}
