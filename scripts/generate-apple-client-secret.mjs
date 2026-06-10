#!/usr/bin/env node
/**
 * Generate AUTH_APPLE_CLIENT_SECRET (ES256 JWT, max ~180 days).
 * Usage: node scripts/generate-apple-client-secret.mjs [path-to-.p8]
 */
import { SignJWT, importPKCS8 } from "jose";
import fs from "node:fs";
import path from "node:path";

const teamId = process.env.APPLE_TEAM_ID ?? "BM9LAU7B7D";
const keyId = process.env.APPLE_KEY_ID ?? "SXBSD9822T";
const clientId = process.env.AUTH_APPLE_CLIENT_ID ?? "ru.mototwin.app.web";
const keyPath =
  process.argv[2] ?? path.join(process.cwd(), "auth/AuthKey_SXBSD9822T.p8");

const keyPem = fs.readFileSync(keyPath, "utf8");
const key = await importPKCS8(keyPem, "ES256");
const now = Math.floor(Date.now() / 1000);
const exp = now + 86400 * 180;

const jwt = await new SignJWT({})
  .setProtectedHeader({ alg: "ES256", kid: keyId })
  .setIssuer(teamId)
  .setSubject(clientId)
  .setAudience("https://appleid.apple.com")
  .setIssuedAt(now)
  .setExpirationTime(exp)
  .sign(key);

console.log(jwt);
console.error(`# exp: ${new Date(exp * 1000).toISOString()} (${clientId})`);
