import { d } from "./money";
import { InvestmentTransaction } from "./types";

export function validateTransaction(transaction: InvestmentTransaction): string[] {
  const errors: string[] = [];

  if (!transaction.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    errors.push("Date must use YYYY-MM-DD format.");
  }

  if (!transaction.assetId.trim()) {
    errors.push("Asset ID is required.");
  }

  if (!transaction.ticker.trim()) {
    errors.push("Ticker is required.");
  }

  if (d(transaction.quantity).lessThanOrEqualTo(0)) {
    errors.push("Quantity must be greater than zero.");
  }

  if (d(transaction.price).lessThan(0)) {
    errors.push("Price cannot be negative.");
  }

  if (d(transaction.commission).lessThan(0)) {
    errors.push("Commission cannot be negative.");
  }

  return errors;
}
