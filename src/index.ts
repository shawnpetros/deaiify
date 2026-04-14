import { definePluginEntry } from "@openclaw/plugin-sdk";
import { messageSending } from "./hooks/message-sending.js";
import { beforeAgentReply } from "./hooks/before-agent-reply.js";
import { DEFAULT_CORRECTION_PROMPT } from "./constants.js";
import type { DeAIifyConfig, DeAIifyState } from "./types.js";

export default definePluginEntry<DeAIifyConfig, DeAIifyState>({
  name: "deaiify",
  description:
    "Intercepts outbound assistant messages containing em-dashes or en-dashes and requests an LLM rewrite without them",

  config: {
    enabled: {
      type: "boolean",
      default: true,
      description: "Enable or disable the plugin",
    },
    maxRetries: {
      type: "integer",
      default: 2,
      min: 1,
      max: 5,
      description: "Max rewrite attempts before shipping as-is",
    },
    channels: {
      type: "array",
      items: { type: "string" },
      default: [],
      description: "Channel IDs to monitor (empty = all channels)",
    },
    correctionPrompt: {
      type: "string",
      default: DEFAULT_CORRECTION_PROMPT,
      description: "The prompt injected to request a dash-free rewrite",
    },
  },

  state: {
    retryCount: 0,
    pendingCorrection: false,
  },

  hooks: {
    message_sending(message, { config, state, context }) {
      return messageSending(message, config, state, context);
    },

    before_agent_reply({ config, state, inject }) {
      beforeAgentReply(config, state, inject);
    },
  },
});
