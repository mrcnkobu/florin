import { d } from "./money";
import { InvestmentTransaction } from "./types";
import { buildPortfolioSummary, sortTransactions } from "./portfolioEngine";

export type ValidationSeverity = "error" | "warning";

export interface LedgerValidationIssue {
  severity: ValidationSeverity;
  transactionId?: string;
  message: string;
}

export interface LedgerValidationReport {
  issues: LedgerValidationIssue[];
  errorCount: number;
  warningCount: number;
}

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

export function validateLedger(transactions: InvestmentTransaction[]): LedgerValidationReport {
  const issues: LedgerValidationIssue[] = [];
  const seenIds = new Set<string>();
  const seenFingerprints = new Map<string, string>();
  const acceptedTransactions: InvestmentTransaction[] = [];

  for (const transaction of sortTransactions(transactions)) {
    if (seenIds.has(transaction.id)) {
      issues.push({
        severity: "error",
        transactionId: transaction.id,
        message: `Duplicate transaction id: ${transaction.id}.`
      });
    }
    seenIds.add(transaction.id);

    for (const message of validateTransaction(transaction)) {
      issues.push({
        severity: "error",
        transactionId: transaction.id,
        message
      });
    }

    const fingerprint = getTransactionFingerprint(transaction);
    const duplicateOf = seenFingerprints.get(fingerprint);
    if (duplicateOf) {
      issues.push({
        severity: "warning",
        transactionId: transaction.id,
        message: `Looks like a duplicate of transaction ${duplicateOf}.`
      });
    } else {
      seenFingerprints.set(fingerprint, transaction.id);
    }

    const errors = validateNewTransaction(acceptedTransactions, transaction);
    for (const message of errors) {
      if (!validateTransaction(transaction).includes(message)) {
        issues.push({
          severity: "error",
          transactionId: transaction.id,
          message
        });
      }
    }

    if (validateTransaction(transaction).length === 0) {
      acceptedTransactions.push(transaction);
    }
  }

  return {
    issues,
    errorCount: issues.filter((issue) => issue.severity === "error").length,
    warningCount: issues.filter((issue) => issue.severity === "warning").length
  };
}

function getTransactionFingerprint(transaction: InvestmentTransaction): string {
  return [
    transaction.date,
    transaction.assetId,
    transaction.action,
    transaction.quantity,
    transaction.price,
    transaction.commission,
    transaction.currency,
    transaction.broker ?? ""
  ].join("|");
}
