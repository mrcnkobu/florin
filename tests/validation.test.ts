import { describe, expect, it } from "vitest";
import { validateLedger, validateNewTransaction, validateTransaction } from "../src/domain/validation";
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

describe("validateLedger", () => {
  it("returns a clean report for a valid ledger", () => {
    const report = validateLedger([
      transaction({
        id: "buy-1",
        action: "buy",
        quantity: "5",
        price: "100",
        date: "2026-01-01"
      }),
      transaction({
        id: "sell-1",
        action: "sell",
        quantity: "2",
        price: "120",
        date: "2026-02-01"
      }),
      transaction({
        id: "dividend-1",
        action: "dividend",
        quantity: "1",
        price: "10",
        date: "2026-03-01"
      })
    ]);

    expect(report).toMatchObject({
      issues: [],
      errorCount: 0,
      warningCount: 0
    });
  });

  it("reports duplicate-looking transactions as warnings", () => {
    const report = validateLedger([
      transaction({
        id: "buy-1",
        action: "buy",
        quantity: "5",
        price: "100",
        date: "2026-01-01"
      }),
      transaction({
        id: "buy-2",
        action: "buy",
        quantity: "5",
        price: "100",
        date: "2026-01-01"
      })
    ]);

    expect(report.warningCount).toBe(1);
    expect(report.issues[0]).toMatchObject({
      severity: "warning",
      transactionId: "buy-2",
      message: "Looks like a duplicate of transaction buy-1."
    });
  });

  it("reports duplicate ids and over-sells as errors", () => {
    const report = validateLedger([
      transaction({
        id: "buy-1",
        action: "buy",
        quantity: "5",
        price: "100",
        date: "2026-01-01"
      }),
      transaction({
        id: "buy-1",
        action: "sell",
        quantity: "6",
        price: "120",
        date: "2026-02-01"
      })
    ]);

    expect(report.errorCount).toBe(2);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          transactionId: "buy-1",
          message: "Duplicate transaction id: buy-1."
        }),
        expect.objectContaining({
          severity: "error",
          transactionId: "buy-1",
          message: "Cannot sell 6 units; only 5 held."
        })
      ])
    );
  });
});
