import Decimal from "decimal.js";
import {
  CashFlow,
  InvestmentTransaction,
  PortfolioLot,
  PortfolioSummary,
  Position,
  PriceSnapshot,
  RealizedPnLRecord
} from "./types";
import { d, toFixedMoney, toFixedPercent, toFixedQuantity } from "./money";

interface MutableLot {
  transactionId: string;
  date: string;
  quantity: Decimal;
  unitCost: Decimal;
}

interface AssetAccumulator {
  transactions: InvestmentTransaction[];
  lots: MutableLot[];
}

export interface BuildPortfolioOptions {
  generatedAt?: string;
  currency?: string;
  prices?: PriceSnapshot[];
}

export function buildPortfolioSummary(
  transactions: InvestmentTransaction[],
  options: BuildPortfolioOptions = {}
): PortfolioSummary {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const currency = options.currency ?? "PLN";
  const pricesByAsset = new Map((options.prices ?? []).map((price) => [price.assetId, price]));
  const assets = new Map<string, AssetAccumulator>();
  const realizedPnL: RealizedPnLRecord[] = [];
  const cashFlows: CashFlow[] = [];
  let cashBalance = d(0);
  let totalBuyCost = d(0);

  for (const transaction of sortTransactions(transactions)) {
    const amount = d(transaction.quantity).times(transaction.price);
    const commission = d(transaction.commission);

    if (transaction.action === "deposit") {
      cashBalance = cashBalance.plus(amount);
      cashFlows.push(cashFlow(transaction, amount));
      continue;
    }

    if (transaction.action === "withdrawal") {
      cashBalance = cashBalance.minus(amount);
      cashFlows.push(cashFlow(transaction, amount.negated()));
      continue;
    }

    if (transaction.action === "dividend" || transaction.action === "interest") {
      cashBalance = cashBalance.plus(amount);
      cashFlows.push(cashFlow(transaction, amount));
      continue;
    }

    if (transaction.action === "fee" || transaction.action === "tax") {
      cashBalance = cashBalance.minus(amount);
      cashFlows.push(cashFlow(transaction, amount.negated()));
      continue;
    }

    const asset = getAssetAccumulator(assets, transaction);

    if (transaction.action === "buy") {
      const totalCost = amount.plus(commission);
      const unitCost = totalCost.div(transaction.quantity);
      asset.lots.push({
        transactionId: transaction.id,
        date: transaction.date,
        quantity: d(transaction.quantity),
        unitCost
      });
      asset.transactions.push(transaction);
      totalBuyCost = totalBuyCost.plus(totalCost);
      cashBalance = cashBalance.minus(totalCost);
      continue;
    }

    if (transaction.action === "sell") {
      const quantityToSell = d(transaction.quantity);
      const costBasis = consumeLots(asset.lots, quantityToSell);
      const proceeds = amount.minus(commission);
      const pnl = proceeds.minus(costBasis);

      asset.transactions.push(transaction);
      realizedPnL.push({
        transactionId: transaction.id,
        date: transaction.date,
        assetId: transaction.assetId,
        ticker: transaction.ticker,
        quantity: toFixedQuantity(quantityToSell),
        proceeds: toFixedMoney(proceeds),
        costBasis: toFixedMoney(costBasis),
        commission: toFixedMoney(commission),
        pnl: toFixedMoney(pnl),
        currency: transaction.currency
      });

      cashBalance = cashBalance.plus(proceeds);
    }
  }

  const positions = buildPositions(assets, pricesByAsset);
  const marketValue = positions.reduce((sum, position) => sum.plus(position.marketValue), d(0));
  const unrealizedPnL = positions.reduce((sum, position) => sum.plus(position.unrealizedPnL), d(0));
  const realizedPnLTotal = realizedPnL.reduce((sum, record) => sum.plus(record.pnl), d(0));

  return {
    generatedAt,
    currency,
    positions,
    realizedPnL,
    cashFlows,
    investedCapital: toFixedMoney(totalBuyCost),
    marketValue: toFixedMoney(marketValue),
    cashBalance: toFixedMoney(cashBalance),
    totalValue: toFixedMoney(marketValue.plus(cashBalance)),
    unrealizedPnL: toFixedMoney(unrealizedPnL),
    realizedPnLTotal: toFixedMoney(realizedPnLTotal)
  };
}

export function sortTransactions(transactions: InvestmentTransaction[]): InvestmentTransaction[] {
  return [...transactions].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) {
      return dateCompare;
    }

    return a.createdAt.localeCompare(b.createdAt);
  });
}

function getAssetAccumulator(
  assets: Map<string, AssetAccumulator>,
  transaction: InvestmentTransaction
): AssetAccumulator {
  const existing = assets.get(transaction.assetId);
  if (existing) {
    return existing;
  }

  const created = {
    transactions: [],
    lots: []
  };
  assets.set(transaction.assetId, created);
  return created;
}

function consumeLots(lots: MutableLot[], quantity: Decimal): Decimal {
  let remaining = quantity;
  let costBasis = d(0);

  for (const lot of lots) {
    if (remaining.lessThanOrEqualTo(0)) {
      break;
    }

    const consumed = Decimal.min(lot.quantity, remaining);
    costBasis = costBasis.plus(consumed.times(lot.unitCost));
    lot.quantity = lot.quantity.minus(consumed);
    remaining = remaining.minus(consumed);
  }

  if (remaining.greaterThan(0)) {
    throw new Error(
      `Cannot sell ${quantity.toString()} units; only ${quantity.minus(remaining).toString()} held.`
    );
  }

  return costBasis;
}

function buildPositions(
  assets: Map<string, AssetAccumulator>,
  pricesByAsset: Map<string, PriceSnapshot>
): Position[] {
  const positions: Position[] = [];

  for (const [assetId, asset] of assets) {
    const openLots = asset.lots.filter((lot) => lot.quantity.greaterThan(0));
    const quantity = openLots.reduce((sum, lot) => sum.plus(lot.quantity), d(0));

    if (quantity.equals(0)) {
      continue;
    }

    const firstTransaction = asset.transactions[0];
    const costBasis = openLots.reduce((sum, lot) => sum.plus(lot.quantity.times(lot.unitCost)), d(0));
    const averageCost = costBasis.div(quantity);
    const priceSnapshot = pricesByAsset.get(assetId);
    const lastPrice = priceSnapshot ? d(priceSnapshot.price) : averageCost;
    const marketValue = quantity.times(lastPrice);
    const unrealizedPnL = marketValue.minus(costBasis);
    const unrealizedPnLPct = costBasis.equals(0) ? d(0) : unrealizedPnL.div(costBasis).times(100);

    positions.push({
      assetId,
      ticker: firstTransaction.ticker,
      name: firstTransaction.name,
      assetType: firstTransaction.assetType,
      quantity: toFixedQuantity(quantity),
      averageCost: toFixedMoney(averageCost),
      lastPrice: toFixedMoney(lastPrice),
      marketValue: toFixedMoney(marketValue),
      costBasis: toFixedMoney(costBasis),
      unrealizedPnL: toFixedMoney(unrealizedPnL),
      unrealizedPnLPct: toFixedPercent(unrealizedPnLPct),
      currency: firstTransaction.currency,
      broker: firstTransaction.broker,
      lots: openLots.map(toPortfolioLot)
    });
  }

  return positions.sort((a, b) => a.ticker.localeCompare(b.ticker));
}

function toPortfolioLot(lot: MutableLot): PortfolioLot {
  const remainingCost = lot.quantity.times(lot.unitCost);

  return {
    transactionId: lot.transactionId,
    date: lot.date,
    quantity: toFixedQuantity(lot.quantity),
    unitCost: toFixedMoney(lot.unitCost),
    remainingCost: toFixedMoney(remainingCost)
  };
}

function cashFlow(transaction: InvestmentTransaction, amount: Decimal): CashFlow {
  return {
    transactionId: transaction.id,
    date: transaction.date,
    action: transaction.action,
    amount: toFixedMoney(amount),
    currency: transaction.currency,
    note: transaction.note
  };
}
