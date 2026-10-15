import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Worktree builds
    ".worktrees/**",
    // Agent worktrees live under .kilo/worktrees, not .worktrees, and are
    // excluded from git only via each clone's .git/info/exclude, so eslint
    // must exclude them separately or local lint double-counts the tree.
    ".kilo/**",
  ]),
  {
    rules: {
      // Mocks keep the real call signature, so unused params are marked with a
      // leading underscore rather than dropped.
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
]);

export default eslintConfig;
