import { describe, expect, it } from "vitest";
import { validateNewTransaction, validateTransaction } from "../src/domain/validation";
import { transaction } from "./fixtures";

describe("validateTransaction", () => {
  it("rejects malformed transaction fields", () => {
    const errors = validateTransaction(
      transaction({
        id: "bad",
        action: "buy",
        date: "19-04-2026",
        quantity: "0",
        price: "-1",
        commission: "-1"
      })
    );

    expect(errors).toContain("Date must use YYYY-MM-DD format.");
    expect(errors).toContain("Quantity must be greater than zero.");
    expect(errors).toContain("Price cannot be negative.");
    expect(errors).toContain("Commission cannot be negative.");
  });
});

describe("validateNewTransaction", () => {
  it("rejects sells that exceed current holdings", () => {
    const existing = [
      transaction({
        id: "buy-1",
        action: "buy",
        quantity: "5",
        price: "100",
        date: "2026-01-01"
      })
    ];
    const candidate = transaction({
      id: "sell-1",
      action: "sell",
      quantity: "6",
      price: "120",
      date: "2026-02-01"
    });

    expect(validateNewTransaction(existing, candidate)).toEqual([
      "Cannot sell 6 units; only 5 held."
    ]);
  });

  it("accepts valid partial sells", () => {
    const existing = [
      transaction({
        id: "buy-1",
        action: "buy",
        quantity: "5",
        price: "100",
        date: "2026-01-01"
      })
    ];
    const candidate = transaction({
      id: "sell-1",
      action: "sell",
      quantity: "2",
      price: "120",
      date: "2026-02-01"
    });

    expect(validateNewTransaction(existing, candidate)).toEqual([]);
  });
});
