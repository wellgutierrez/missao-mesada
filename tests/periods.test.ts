import { describe, expect, it } from "vitest";
import { calculateEndDate } from "@/features/children/data/periods";

describe("calculateEndDate", () => {
  it("keeps weekly periods seven days ahead", () => {
    expect(calculateEndDate("2026-04-22", "weekly")).toBe("2026-04-29");
  });

  it("keeps biweekly periods fifteen days ahead", () => {
    expect(calculateEndDate("2026-04-22", "biweekly")).toBe("2026-05-07");
  });

  it("clamps monthly periods to the last valid day of the next month", () => {
    expect(calculateEndDate("2026-01-31", "monthly")).toBe("2026-02-28");
  });

  it("preserves the same calendar day for standard monthly transitions", () => {
    expect(calculateEndDate("2026-04-22", "monthly")).toBe("2026-05-22");
  });

  it("returns the original string for invalid dates", () => {
    expect(calculateEndDate("not-a-date", "monthly")).toBe("not-a-date");
  });
});