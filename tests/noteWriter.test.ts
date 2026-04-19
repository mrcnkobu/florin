import { describe, expect, it } from "vitest";
import { insertManagedSection, replaceManagedSection } from "../src/infrastructure/managedSection";

describe("managed markdown sections", () => {
  it("inserts a managed section without removing user content", () => {
    const result = insertManagedSection("# Portfolio\n\n## Notes\nUser text\n", "generated");

    expect(result).toContain("# Portfolio");
    expect(result).toContain("User text");
    expect(result).toContain("<!-- florin:start -->");
    expect(result).toContain("generated");
    expect(result).toContain("<!-- florin:end -->");
  });

  it("replaces only the managed section", () => {
    const current = [
      "# Portfolio",
      "",
      "Before",
      "<!-- florin:start -->",
      "old",
      "<!-- florin:end -->",
      "After"
    ].join("\n");

    const result = replaceManagedSection(current, "new");

    expect(result).toContain("Before");
    expect(result).toContain("After");
    expect(result).toContain("new");
    expect(result).not.toContain("old");
  });
});
