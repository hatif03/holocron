#!/usr/bin/env node
/** Import LLM keys from .env into storage/llm_config.json via agents API. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");

function parseEnv(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const env = fs.existsSync(envPath) ? parseEnv(fs.readFileSync(envPath, "utf8")) : {};
const keys = {};
if (env.K2THINK_API_KEY && env.K2THINK_API_KEY !== "mock-key-for-dev") {
  keys.k2think = env.K2THINK_API_KEY;
}
if (env.GROQ_API_KEY) keys.groq = env.GROQ_API_KEY;
if (env.OPENAI_API_KEY) keys.openai = env.OPENAI_API_KEY;

if (!Object.keys(keys).length) {
  console.log("No LLM keys found in .env — skipping bootstrap.");
  process.exit(0);
}

const AGENTS = process.env.AGENTS_SERVICE_URL || "http://localhost:8000";
const body = {
  provider: "k2think",
  keys,
  model: env.K2THINK_MODEL || "MBZUAI-IFM/K2-Think-v2",
  base_url: (env.K2THINK_BASE_URL || "https://api.k2think.ai/v1/chat/completions").replace(
    "/chat/completions",
    ""
  ),
};
if (keys.k2think) body.api_key = keys.k2think;

const res = await fetch(`${AGENTS}/config/llm`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const data = await res.json();
if (!res.ok) {
  console.error("Bootstrap failed:", data);
  process.exit(1);
}

console.log(
  `LLM bootstrap: provider=${data.provider} mock_llm=${data.mock_llm} api_key_set=${data.api_key_set}`
);
