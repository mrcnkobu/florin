import { describe, expect, it } from "vitest";
import { getStooqQuoteUrl, parseStooqQuote, toStooqSymbol } from "../src/integrations/stooqCore";

describe("toStooqSymbol", () => {
  it("maps Polish display tickers to Stooq symbols", () => {
    expect(toStooqSymbol({ assetId: "CDR.PL", ticker: "CDR.PL" })).toBe("cdr");
  });

  it("leaves explicit non-PL suffixes intact", () => {
    expect(toStooqSymbol({ assetId: "AAPL.US", ticker: "AAPL.US" })).toBe("aapl.us");
  });
});

describe("getStooqQuoteUrl", () => {
  it("builds the CSV quote endpoint URL", () => {
    expect(getStooqQuoteUrl("cdr")).toBe(
      "https://stooq.com/q/l/?s=cdr&f=sd2t2ohlcv&h=&e=csv"
    );
  });
});

describe("parseStooqQuote", () => {
  it("parses a valid Stooq CSV quote", () => {
    const quote = parseStooqQuote(
      ["Symbol,Date,Time,Open,High,Low,Close,Volume", "CDR,2026-04-20,17:00:00,100,110,99,108.50,12345"].join(
        "\n"
      )
    );

    expect(quote).toMatchObject({
      symbol: "CDR",
      date: "2026-04-20",
      time: "17:00:00",
      close: "108.50",
      volume: "12345"
    });
  });

  it("rejects missing prices", () => {
    expect(() =>
      parseStooqQuote(
        ["Symbol,Date,Time,Open,High,Low,Close,Volume", "CDR,N/D,N/D,N/D,N/D,N/D,N/D,N/D"].join(
          "\n"
        )
      )
    ).toThrow("valid close price");
  });
});
