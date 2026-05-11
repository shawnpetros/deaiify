// Plain config object (no `defineConfig` import) so vitest picks it up
// even when vitest is resolved transiently via `npx` rather than installed
// locally. The shape matches `UserConfig` from `vitest/config`.
export default {
  test: {
    include: [
      "src/__tests__/**/*.test.ts",
      "claude-code/__tests__/**/*.test.{ts,mjs,js}",
    ],
    coverage: {
      provider: "v8" as const,
      include: ["src/**/*.ts", "claude-code/**/*.mjs"],
      exclude: [
        "src/__tests__/**",
        // index.ts is a thin SDK shim that requires @openclaw/plugin-sdk at
        // runtime. The hook logic it delegates to lives in src/register.ts,
        // which IS covered.
        "src/index.ts",
        "dist/**",
        "scripts/**",
        "node_modules/**",
      ],
      reporter: ["text", "html", "json-summary"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
};
