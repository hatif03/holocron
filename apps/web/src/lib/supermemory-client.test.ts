import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  isSupermemoryEnabled,
  summarizeReferenceAnalysis,
  summarizeGraph,
  workTag,
} from "./supermemory-client";

describe("supermemory-client", () => {
  beforeEach(() => {
    vi.stubEnv("SUPERMEMORY_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is disabled without api key", () => {
    expect(isSupermemoryEnabled()).toBe(false);
  });

  it("summarizes reference analysis compactly", () => {
    const summary = summarizeReferenceAnalysis({
      title: "Paper A",
      key_claims: ["claim one", "claim two"],
      methods: "Randomized trial",
    });
    expect(summary).toContain("Paper A");
    expect(summary).toContain("claim one");
    expect(summary).toContain("Randomized trial");
  });

  it("summarizes graph nodes", () => {
    const summary = summarizeGraph({
      nodes: [{ type: "idea", label: "Hypothesis" }],
      edges: [{ source: "a", target: "b" }],
    });
    expect(summary).toContain("Research graph");
    expect(summary).toContain("Hypothesis");
  });

  it("uses work tag helper", () => {
    expect(workTag("id-1")).toBe("work_id-1");
  });
});
