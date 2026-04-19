import { InvestmentTransaction, TransactionAction, AssetType } from "../src/domain/types";

export function transaction(
  overrides: Partial<InvestmentTransaction> & {
    id: string;
    action: TransactionAction;
    quantity: string;
    price: string;
  }
): InvestmentTransaction {
  const now = "2026-04-19T10:00:00.000Z";

  return {
    id: overrides.id,
    date: overrides.date ?? "2026-04-19",
    assetId: overrides.assetId ?? "CDR.PL",
    ticker: overrides.ticker ?? "CDR.PL",
    name: overrides.name ?? "CD Projekt",
    assetType: overrides.assetType ?? ("stock" satisfies AssetType),
    action: overrides.action,
    quantity: overrides.quantity,
    price: overrides.price,
    commission: overrides.commission ?? "0",
    currency: overrides.currency ?? "PLN",
    broker: overrides.broker ?? "XTB",
    note: overrides.note,
    source: overrides.source ?? "manual",
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    sourceBroker: overrides.sourceBroker,
    sourceFileHash: overrides.sourceFileHash,
    sourceRowHash: overrides.sourceRowHash
  };
}
