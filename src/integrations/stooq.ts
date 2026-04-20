import { requestUrl } from "obsidian";
import { d } from "../domain/money";
import { Position, PriceSnapshot } from "../domain/types";
import { getStooqQuoteUrl, parseStooqQuote, toStooqSymbol } from "./stooqCore";
export { getStooqQuoteUrl, parseStooqQuote, toStooqSymbol } from "./stooqCore";

export interface StooqFetchResult {
  prices: PriceSnapshot[];
  failures: string[];
}

export async function fetchStooqPrices(
  positions: Position[],
  updatedAt: string
): Promise<StooqFetchResult> {
  const prices: PriceSnapshot[] = [];
  const failures: string[] = [];
  const fetchablePositions = positions.filter(
    (position) => position.assetType === "stock" || position.assetType === "etf"
  );

  for (const position of fetchablePositions) {
    const symbol = toStooqSymbol(position);
    const url = getStooqQuoteUrl(symbol);

    try {
      const response = await requestUrl({ url });
      const quote = parseStooqQuote(response.text);

      prices.push({
        assetId: position.assetId,
        price: d(quote.close).toDecimalPlaces(2).toFixed(2),
        currency: position.currency,
        updatedAt,
        source: "stooq"
      });
    } catch {
      failures.push(position.ticker);
    }
  }

  return { prices, failures };
}
