import { describe, expect, it } from "vitest";
import { buildPortfolioSummary } from "../src/domain/portfolioEngine";
import { transaction } from "./fixtures";

describe("buildPortfolioSummary", () => {
  it("builds an open position using FIFO lots and decimal arithmetic", () => {
    const summary = buildPortfolioSummary(
      [
        transaction({
          id: "buy-1",
          action: "buy",
          quantity: "10",
          price: "100.10",
          commission: "4",
          date: "2026-01-01"
        }),
        transaction({
          id: "buy-2",
          action: "buy",
          quantity: "5",
          price: "120.20",
          commission: "2",
          date: "2026-02-01"
        })
      ],
      {
        generatedAt: "2026-04-19T10:00:00.000Z",
        prices: [
          {
            assetId: "CDR.PL",
            price: "130",
            currency: "PLN",
            source: "manual",
            updatedAt: "2026-04-19T10:00:00.000Z"
          }
        ]
      }
    );

    expect(summary.positions).toHaveLength(1);
    expect(summary.positions[0]).toMatchObject({
      quantity: "15",
      averageCost: "107.20",
      lastPrice: "130.00",
      marketValue: "1950.00",
      costBasis: "1608.00",
      unrealizedPnL: "342.00"
    });
    expect(summary.cashBalance).toBe("-1608.00");
  });

  it("calculates realized P&L from FIFO lots on sell", () => {
    const summary = buildPortfolioSummary([
      transaction({
        id: "buy-1",
        action: "buy",
        quantity: "10",
        price: "100",
        commission: "10",
        date: "2026-01-01"
      }),
      transaction({
        id: "sell-1",
        action: "sell",
        quantity: "4",
        price: "150",
        commission: "4",
        date: "2026-02-01"
      })
    ]);

    expect(summary.realizedPnL).toHaveLength(1);
    expect(summary.realizedPnL[0]).toMatchObject({
      proceeds: "596.00",
      costBasis: "404.00",
      commission: "4.00",
      pnl: "192.00"
    });
    expect(summary.positions[0]).toMatchObject({
      quantity: "6",
      costBasis: "606.00"
    });
  });

  it("tracks fully sold assets as closed positions", () => {
    const summary = buildPortfolioSummary([
      transaction({
        id: "buy-1",
        action: "buy",
        quantity: "10",
        price: "100",
        commission: "10",
        date: "2026-01-01"
      }),
      transaction({
        id: "sell-1",
        action: "sell",
        quantity: "10",
        price: "110",
        commission: "5",
        date: "2026-02-01"
      })
    ]);

    expect(summary.positions).toHaveLength(0);
    expect(summary.closedPositions).toHaveLength(1);
    expect(summary.closedPositions[0]).toMatchObject({
      ticker: "CDR.PL",
      status: "closed",
      quantity: "0",
      marketValue: "0.00"
    });
  });

  it("tracks cash flows for deposits, dividends, fees, taxes, and withdrawals", () => {
    const summary = buildPortfolioSummary([
      transaction({
        id: "deposit-1",
        action: "deposit",
        assetId: "CASH.PLN",
        ticker: "PLN",
        assetType: "cash",
        quantity: "1000",
        price: "1"
      }),
      transaction({
        id: "dividend-1",
        action: "dividend",
        quantity: "1",
        price: "25"
      }),
      transaction({
        id: "fee-1",
        action: "fee",
        quantity: "1",
        price: "5"
      }),
      transaction({
        id: "tax-1",
        action: "tax",
        quantity: "1",
        price: "3"
      }),
      transaction({
        id: "withdrawal-1",
        action: "withdrawal",
        assetId: "CASH.PLN",
        ticker: "PLN",
        assetType: "cash",
        quantity: "100",
        price: "1"
      })
    ]);

    expect(summary.cashBalance).toBe("917.00");
    expect(summary.cashFlows).toHaveLength(5);
  });

  it("throws when selling more than currently held", () => {
    expect(() =>
      buildPortfolioSummary([
        transaction({
          id: "buy-1",
          action: "buy",
          quantity: "1",
          price: "100"
        }),
        transaction({
          id: "sell-1",
          action: "sell",
          quantity: "2",
          price: "100"
        })
      ])
    ).toThrow("Cannot sell 2 units");
  });
});
