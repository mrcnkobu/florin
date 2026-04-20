import { d } from "../domain/money";
import { Position } from "../domain/types";

export interface StooqQuote {
  symbol: string;
  date: string;
  time: string;
  close: string;
  volume: string;
}

export function getStooqQuoteUrl(symbol: string): string {
  const params = new URLSearchParams({
    s: symbol,
    f: "sd2t2ohlcv",
    h: "",
    e: "csv"
  });

  return `https://stooq.com/q/l/?${params.toString()}`;
}

export function toStooqSymbol(position: Pick<Position, "assetId" | "ticker">): string {
  const raw = (position.ticker || position.assetId).trim().toLowerCase();

  if (raw.endsWith(".pl")) {
    return raw.slice(0, -3);
  }

  return raw;
}

export function parseStooqQuote(csv: string): StooqQuote {
  const lines = csv
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("Stooq response did not contain quote data.");
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const values = parseCsvLine(lines[1]);
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  const close = row.close;

  if (!close || close.toLowerCase() === "n/d" || d(close).lessThanOrEqualTo(0)) {
    throw new Error("Stooq response did not contain a valid close price.");
  }

  return {
    symbol: row.symbol ?? "",
    date: row.date ?? "",
    time: row.time ?? "",
    close,
    volume: row.volume ?? ""
  };
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}
