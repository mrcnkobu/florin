import { describe, expect, it } from "vitest";
import { formatDatePattern } from "../src/domain/time";

describe("formatDatePattern", () => {
  it("formats year-month folders and weekday file names", () => {
    const date = new Date("2026-04-20T10:00:00.000Z");

    expect(
      formatDatePattern(date, "Europe/Warsaw", "Daily/yyyy-mm/yyyy-mm-dd_ddd.md", "en-GB")
    ).toBe("Daily/2026-04/2026-04-20_Mon.md");
  });

  it("formats weekdays using the configured locale", () => {
    const date = new Date("2026-04-20T10:00:00.000Z");

    expect(formatDatePattern(date, "Europe/Warsaw", "yyyy-mm-dd_ddd", "pl-PL")).toBe(
      "2026-04-20_pon"
    );
  });

  it("uses the configured timezone for date boundaries", () => {
    const date = new Date("2026-04-19T22:30:00.000Z");

    expect(formatDatePattern(date, "Europe/Warsaw", "yyyy-mm-dd_ddd", "en-GB")).toBe(
      "2026-04-20_Mon"
    );
  });
});
