import { definePluginEntry } from "@openclaw/plugin-sdk/plugin-entry";
import { resolvePreferredOpenClawTmpDir } from "@openclaw/plugin-sdk/temp-path";
import { registerHooks } from "./register.js";

export default definePluginEntry({
  id: "deaiify",
  name: "deAIify",
  description:
    "Intercepts em-dashes and en-dashes in outbound replies. " +
    "Rewrites via embedded LLM so sentences are properly restructured, not just character-swapped.",

  register(api) {
    registerHooks(api as never, { resolvePreferredOpenClawTmpDir });
  },
});
