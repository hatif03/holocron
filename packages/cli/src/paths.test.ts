import { describe, it, expect } from "vitest";
import {
  getPlatform,
  getPrerequisiteLinks,
  checkNodeVersion,
} from "../src/prerequisites.js";
import { getPackageVersion, getDataDir, getHolocronDir } from "../src/paths.js";

describe("prerequisites", () => {
  it("returns platform-specific links", () => {
    const links = getPrerequisiteLinks();
    expect(links.node).toContain("nodejs.org");
    expect(links.docker).toBeTruthy();
    expect(Array.isArray(links.platformNotes)).toBe(true);
  });

  it("detects current platform", () => {
    const platform = getPlatform();
    expect(["win32", "darwin", "linux", "other"]).toContain(platform);
  });

  it("validates node version", () => {
    const result = checkNodeVersion();
    expect(result.version).toMatch(/^v\d+/);
    expect(typeof result.ok).toBe("boolean");
  });
});

describe("paths", () => {
  it("reads package version", () => {
    const version = getPackageVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("resolves holocron directories", () => {
    expect(getHolocronDir()).toContain(".holocron");
    expect(getDataDir()).toContain("data");
  });
});
