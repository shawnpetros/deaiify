declare const _default: {
    id: string;
    name: string;
    description: string;
    configSchema: import("@openclaw/plugin-sdk/core.js").OpenClawPluginConfigSchema;
    register: NonNullable<import("@openclaw/plugin-sdk/core.js").OpenClawPluginDefinition["register"]>;
} & Pick<import("@openclaw/plugin-sdk/core.js").OpenClawPluginDefinition, "kind" | "reload" | "nodeHostCommands" | "securityAuditCollectors">;
export default _default;
