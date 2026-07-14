import { describe, expect, it } from "vitest";
import { parseBibTeX } from "./bibtex";

describe("parseBibTeX", () => {
  it("parses a basic article entry", () => {
    const entry = `@article{smith2024,
      title={Deep Learning for Science},
      author={Smith, Jane and Doe, John},
      year={2024},
      doi={10.1000/xyz}
    }`;
    const parsed = parseBibTeX(entry);
    expect(parsed.title).toBe("Deep Learning for Science");
    expect(parsed.authors).toContain("Smith");
    expect(parsed.year).toBe(2024);
    expect(parsed.doi).toBe("10.1000/xyz");
  });

  it("handles nested braces in title", () => {
    const entry = `@article{x, title={{Nested} Title}, author={A}, year={2023}}`;
    const parsed = parseBibTeX(entry);
    expect(parsed.title).toContain("Nested");
  });
});
