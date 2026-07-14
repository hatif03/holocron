import { describe, expect, it } from "vitest";
import { buildGraphFromMetadata } from "./metadata-generation.js";

describe("buildGraphFromMetadata", () => {
  it("creates start-to-end graph from metadata fields", () => {
    const graph = buildGraphFromMetadata({
      title: "Test Paper",
      idea: "We hypothesize X",
      method: "Use method Y",
      data: "Dataset Z",
      experiments: "Run ablations",
      bibtex: "",
    });
    expect(graph.nodes.length).toBeGreaterThanOrEqual(5);
    expect(graph.edges.length).toBeGreaterThanOrEqual(4);
    const types = graph.nodes.map((n) => n.type);
    expect(types).toContain("idea");
    expect(types).toContain("end");
  });
});
