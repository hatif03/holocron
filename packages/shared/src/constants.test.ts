import { describe, expect, it } from "vitest";
import { LOCAL_USER_ID, workTag, userTag, SUPERMEMORY_FILTER_PROMPT, SUPERMEMORY_SEARCH_THRESHOLD } from "./constants.js";

describe("constants", () => {
  it("exports local user id", () => {
    expect(LOCAL_USER_ID).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("builds container tags", () => {
    expect(workTag("abc")).toBe("work_abc");
    expect(userTag()).toBe(`user_${LOCAL_USER_ID}`);
  });

  it("includes holocron filter prompt", () => {
    expect(SUPERMEMORY_FILTER_PROMPT).toContain("Holocron");
    expect(SUPERMEMORY_SEARCH_THRESHOLD).toBe(0.3);
  });
});
