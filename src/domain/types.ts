export type AssetType = "stock" | "etf" | "bond" | "cash" | "other";

export type TransactionAction =
  | "buy"
  | "sell"
  | "dividend"
  | "interest"
  | "fee"
  | "tax"
  | "deposit"
  | "withdrawal";

export type TransactionSource = "manual" | "import";

export interface InvestmentTransaction {
  id: string;
  date: string;
  assetId: string;
  ticker: string;
  name?: string;
  assetType: AssetType;
  action: TransactionAction;
  quantity: string;
  price: string;
  commission: string;
  currency: string;
  broker?: string;
  note?: string;
  source: TransactionSource;
  createdAt: string;
  updatedAt: string;
  sourceBroker?: string;
  sourceFileHash?: string;
  sourceRowHash?: string;
}

export interface TransactionStoreData {
  version: 1;
  transactions: InvestmentTransaction[];
}

export interface PriceStoreData {
  version: 1;
  prices: PriceSnapshot[];
}

export interface PriceSnapshot {
  assetId: string;
  price: string;
  currency: string;
  updatedAt: string;
  source: "manual" | "stooq" | "nbp" | "yahoo";
}

export interface PortfolioLot {
  transactionId: string;
  date: string;
  quantity: string;
  unitCost: string;
  remainingCost: string;
}

export interface Position {
  assetId: string;
  ticker: string;
  name?: string;
  assetType: AssetType;
  status: "open" | "closed";
  quantity: string;
  averageCost: string;
  lastPrice: string;
  marketValue: string;
  costBasis: string;
  unrealizedPnL: string;
  unrealizedPnLPct: string;
  currency: string;
  broker?: string;
  lots: PortfolioLot[];
}

export interface RealizedPnLRecord {
  transactionId: string;
  date: string;
  assetId: string;
  ticker: string;
  quantity: string;
  proceeds: string;
  costBasis: string;
  commission: string;
  pnl: string;
  currency: string;
}

export interface CashFlow {
  transactionId: string;
  date: string;
  action: TransactionAction;
  amount: string;
  currency: string;
  note?: string;
}

export interface PortfolioSummary {
  generatedAt: string;
  currency: string;
  positions: Position[];
  closedPositions: Position[];
  realizedPnL: RealizedPnLRecord[];
  cashFlows: CashFlow[];
  investedCapital: string;
  marketValue: string;
  cashBalance: string;
  totalValue: string;
  unrealizedPnL: string;
  realizedPnLTotal: string;
}

export interface FlorinSettings {
  portfolioNotePath: string;
  transactionsNotePath: string;
  assetsFolderPath: string;
  snapshotsFolderPath: string;
  dataFilePath: string;
  pricesFilePath: string;
  defaultCurrency: string;
  defaultBroker: string;
  dateFormat: string;
  timezone: string;
  dailyNotePathPattern: string;
  dailyNoteWeekdayLocale: string;
}
