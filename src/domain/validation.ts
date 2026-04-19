import { d } from "./money";
import { InvestmentTransaction } from "./types";
import { buildPortfolioSummary } from "./portfolioEngine";

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

export function validateNewTransaction(
  existingTransactions: InvestmentTransaction[],
  transaction: InvestmentTransaction
): string[] {
  const errors = validateTransaction(transaction);

  if (errors.length > 0) {
    return errors;
  }

  try {
    buildPortfolioSummary([...existingTransactions, transaction], {
      currency: transaction.currency,
      generatedAt: transaction.createdAt
    });
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Transaction would make the ledger invalid.");
  }

  return errors;
}
