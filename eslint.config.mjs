import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * MT-SEC-068 / MT-SEC-069 input-validation guards.
 *
 * Applied only to `src/app/api/**\/route.ts` to keep noise low and align with
 * the conventions documented in `docs/api-backend.md` §2.1.
 *
 * Rules:
 *   1. `await request.json()` is forbidden — request bodies must go through
 *      `parseJsonBody()` so DoS via huge / non-JSON payloads is rejected at
 *      the parser layer with a 4xx instead of an uncaught 500.
 *   2. `z.object({...})` is forbidden — use `strictObject({...})` from
 *      `@/lib/http/input-validation` to opt into `.strict()` automatically
 *      (mass-assignment defence).
 *
 * If you have a legitimate reason to bypass these guards (e.g. you are
 * handling `multipart/form-data` or composing a schema that genuinely needs
 * `.passthrough()`), prefix the line with `// eslint-disable-next-line
 * no-restricted-syntax -- <reason / MT-SEC link>` so reviewers can audit.
 */
const inputValidationGuards = {
  files: ["src/app/api/**/route.ts"],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "AwaitExpression > CallExpression[callee.type='MemberExpression'][callee.property.name='json'][callee.object.name='request']",
        message:
          "Use `parseJsonBody(request, { maxBytes })` from '@/lib/http/parse-json-body' (MT-SEC-069). Direct `await request.json()` allows DoS via huge payloads.",
      },
      {
        selector:
          "CallExpression[callee.type='MemberExpression'][callee.object.name='z'][callee.property.name='object']",
        message:
          "Use `strictObject({...})` from '@/lib/http/input-validation' instead of `z.object({...})` so unknown keys are rejected by default (MT-SEC-068 mass-assignment defence).",
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  inputValidationGuards,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
