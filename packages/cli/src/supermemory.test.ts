import { describe, expect, it } from "vitest";
import { envHasSupermemoryKey, appendSupermemoryKeyToEnv } from "./supermemory.js";
import fs from "fs";
import os from "os";
import path from "path";

describe("supermemory env helpers", () => {
  it("detects missing key", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "holocron-test-"));
    const envPath = path.join(dir, ".env");
    fs.writeFileSync(envPath, "SUPERMEMORY_API_KEY=\n");
    expect(envHasSupermemoryKey(envPath)).toBe(false);
  });

  it("detects configured key", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "holocron-test-"));
    const envPath = path.join(dir, ".env");
    fs.writeFileSync(envPath, "SUPERMEMORY_API_KEY=sm_test_key\n");
    expect(envHasSupermemoryKey(envPath)).toBe(true);
  });

  it("writes key to env file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "holocron-test-"));
    const envPath = path.join(dir, ".env");
    appendSupermemoryKeyToEnv(envPath, "sm_new_key");
    const content = fs.readFileSync(envPath, "utf-8");
    expect(content).toContain("SUPERMEMORY_API_KEY=sm_new_key");
    expect(content).toContain("SUPERMEMORY_API_URL=http://localhost:6767");
  });
});
