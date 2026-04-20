import { App, TFile } from "obsidian";
import Decimal from "decimal.js";
import { d, formatMoney, formatPercent, formatSignedMoney } from "../domain/money";
import {
  AssetType,
  PortfolioSummary,
  Position,
  InvestmentTransaction,
  TransactionAction
} from "../domain/types";
import { sortTransactions } from "../domain/portfolioEngine";
import { insertManagedSection, replaceManagedSection } from "./managedSection";
import { asTFile, ensureFolder, ensureParentFolder } from "./vaultPaths";

export interface NoteWriterOptions {
  portfolioNotePath: string;
  transactionsNotePath: string;
  assetsFolderPath: string;
  snapshotsFolderPath: string;
  timezone: string;
}

export class NoteWriter {
  constructor(
    private readonly app: App,
    private readonly options: NoteWriterOptions
  ) {}

  async writeAll(summary: PortfolioSummary, transactions: InvestmentTransaction[]): Promise<void> {
    await this.writeManagedFile(
      this.options.portfolioNotePath,
      "# Portfolio\n\n## Notes\n\n_Your investment notes live here._\n",
      renderPortfolio(summary)
    );
    await this.writeManagedFile(
      this.options.transactionsNotePath,
      "# Transactions\n\n",
      renderTransactions(transactions, summary.generatedAt)
    );
    await this.writeAssetNotes(summary, transactions);
  }

  async writeSnapshot(summary: PortfolioSummary, date: string): Promise<string> {
    await ensureFolder(this.app, this.options.snapshotsFolderPath);
    const path = `${this.options.snapshotsFolderPath}/${date}.md`;
    const body = renderSnapshot(summary, date);
    await this.writeManagedFile(path, `# Investment Snapshot ${date}\n\n`, body);
    return path;
  }

  async writeDailySnapshot(summary: PortfolioSummary, path: string, date: string): Promise<string> {
    const body = renderSnapshot(summary, date);
    await this.writeManagedFile(path, `# ${date}\n\n`, body);
    return path;
  }

  private async writeAssetNotes(
    summary: PortfolioSummary,
    transactions: InvestmentTransaction[]
  ): Promise<void> {
    await ensureFolder(this.app, this.options.assetsFolderPath);

    for (const position of [...summary.positions, ...summary.closedPositions]) {
      const path = `${this.options.assetsFolderPath}/${sanitizeFileName(position.assetId)}.md`;
      const initial = `# ${position.name ?? position.ticker}\n\n## Research\n\n_Thesis, links, and observations._\n`;
      const relatedTransactions = transactions.filter(
        (transaction) => transaction.assetId === position.assetId
      );
      await this.writeManagedFile(
        path,
        initial,
        renderAsset(position, relatedTransactions, summary.generatedAt)
      );
    }
  }

  private async writeManagedFile(path: string, initialContent: string, managedContent: string) {
    await ensureParentFolder(this.app, path);
    const file = asTFile(this.app.vault.getAbstractFileByPath(path), path);

    if (!file) {
      await this.app.vault.create(path, insertManagedSection(initialContent, managedContent));
      return;
    }

    const current = await this.app.vault.read(file);
    await this.app.vault.modify(file, replaceManagedSection(current, managedContent));
  }
}

export async function openFile(app: App, path: string): Promise<void> {
  const file = asTFile(app.vault.getAbstractFileByPath(path), path);

  if (!(file instanceof TFile)) {
    throw new Error(`${path} does not exist.`);
  }

  await app.workspace.getLeaf(false).openFile(file);
}

function renderPortfolio(summary: PortfolioSummary): string {
  const income = sumCashFlows(summary, ["dividend", "interest"]);
  const costs = sumCashFlows(summary, ["fee", "tax"]);

  return [
    `_Updated ${summary.generatedAt}. Values are estimates based on the local ledger._`,
    "",
    "### Overview",
    "",
    `*Total value:* ${formatMoney(summary.totalValue, summary.currency)}  `,
    `*Market value:* ${formatMoney(summary.marketValue, summary.currency)}  `,
    `*Cash:* ${formatMoney(summary.cashBalance, summary.currency)}  `,
    `*Open positions:* ${summary.positions.length}  `,
    `*Closed positions:* ${summary.closedPositions.length}`,
    "",
    `*Unrealised P&L:* ${formatSignedMoney(summary.unrealizedPnL, summary.currency)}  `,
    `*Realised P&L:* ${formatSignedMoney(summary.realizedPnLTotal, summary.currency)}  `,
    `*Invested capital:* ${formatMoney(summary.investedCapital, summary.currency)}`,
    "",
    "### Result",
    "",
    `*Income:* ${formatMoney(income, summary.currency)}  `,
    `*Fees and taxes:* ${formatMoney(costs.abs(), summary.currency)}  `,
    `*Realised trades:* ${summary.realizedPnL.length}`,
    "",
    ...renderPositionGroups(summary.positions),
    "",
    "### Closed",
    "",
    renderClosedPositions(summary.closedPositions)
  ].join("\n");
}

function renderTransactions(transactions: InvestmentTransaction[], generatedAt?: string): string {
  const rows = sortTransactions(transactions)
    .reverse()
    .map((transaction) =>
      [
        transaction.date,
        transaction.ticker,
        transaction.assetType,
        transaction.action,
        transaction.quantity,
        formatMoney(transaction.price, transaction.currency),
        formatMoney(transaction.commission, transaction.currency),
        transaction.broker ?? ""
      ].join(" | ")
    );

  return [
    `_Updated ${generatedAt ?? "now"}. ${transactions.length} transactions recorded._`,
    "",
    "| Date | Ticker | Type | Action | Qty | Price | Commission | Broker |",
    "|---|---|---|---|---:|---:|---:|---|",
    rows.length > 0
      ? rows.map((row) => `| ${row} |`).join("\n")
      : "| _No transactions_ | | | | | | | |"
  ].join("\n");
}

function renderAsset(
  position: Position,
  transactions: InvestmentTransaction[],
  generatedAt: string
): string {
  const rows = sortTransactions(transactions)
    .reverse()
    .map((transaction) =>
      [
        transaction.date,
        transaction.action,
        transaction.quantity,
        formatMoney(transaction.price, transaction.currency),
        formatMoney(transaction.commission, transaction.currency)
      ].join(" | ")
    );

  return [
    `_Updated ${generatedAt}. Generated from the local Florin ledger._`,
    "",
    "### Position",
    "",
    `*Ticker:* ${position.ticker}  `,
    `*Type:* ${position.assetType}  `,
    `*Status:* ${position.status}  `,
    `*Quantity:* ${position.quantity}  `,
    `*Broker:* ${position.broker ?? "_not set_"}`,
    "",
    `*Value:* ${formatMoney(position.marketValue, position.currency)}  `,
    `*Average cost:* ${formatMoney(position.averageCost, position.currency)}  `,
    `*Last price:* ${formatMoney(position.lastPrice, position.currency)}  `,
    `*P&L:* ${formatSignedMoney(position.unrealizedPnL, position.currency)} (${formatPercent(position.unrealizedPnLPct)})`,
    "",
    "### Trades",
    "",
    "| Date | Action | Qty | Price | Commission |",
    "|---|---|---:|---:|---:|",
    rows.length > 0 ? rows.map((row) => `| ${row} |`).join("\n") : "| _No trades_ | | | | |"
  ].join("\n");
}

function renderPositionGroups(positions: Position[]): string[] {
  const groups: AssetType[] = ["stock", "etf", "bond", "other"];
  const sections: string[] = [];

  for (const assetType of groups) {
    const groupedPositions = positions.filter((position) => position.assetType === assetType);
    if (groupedPositions.length === 0) {
      continue;
    }

    sections.push(`### ${assetTypeLabel(assetType)}`);
    sections.push("");
    sections.push(renderPositionTable(groupedPositions));
    sections.push("");
  }

  if (sections.length === 0) {
    return ["### Positions", "", "_No open positions._"];
  }

  return sections.slice(0, -1);
}

function renderPositionTable(positions: Position[]): string {
  const rows = positions.map((position) =>
    [
      position.ticker,
      position.quantity,
      formatMoney(position.averageCost, position.currency),
      formatMoney(position.lastPrice, position.currency),
      formatMoney(position.marketValue, position.currency),
      formatSignedMoney(position.unrealizedPnL, position.currency),
      formatPercent(position.unrealizedPnLPct)
    ].join(" | ")
  );

  return [
    "| Ticker | Qty | Avg cost | Last price | Value | P&L | P&L % |",
    "|---|---:|---:|---:|---:|---:|---:|",
    rows.map((row) => `| ${row} |`).join("\n")
  ].join("\n");
}

function renderClosedPositions(positions: Position[]): string {
  if (positions.length === 0) {
    return "_No closed positions._";
  }

  const rows = positions.map((position) =>
    [position.ticker, position.assetType, position.currency, position.broker ?? ""].join(" | ")
  );

  return [
    "| Ticker | Type | Currency | Broker |",
    "|---|---|---|---|",
    rows.map((row) => `| ${row} |`).join("\n")
  ].join("\n");
}

function sumCashFlows(summary: PortfolioSummary, actions: TransactionAction[]): Decimal {
  return summary.cashFlows
    .filter((flow) => actions.includes(flow.action))
    .reduce((sum, flow) => sum.plus(flow.amount), d(0));
}

function assetTypeLabel(assetType: AssetType): string {
  switch (assetType) {
    case "stock":
      return "Stocks";
    case "etf":
      return "ETFs";
    case "bond":
      return "Bonds";
    case "cash":
      return "Cash";
    case "other":
      return "Other";
  }
}

function renderSnapshot(summary: PortfolioSummary, date: string): string {
  return [
    `### Investments`,
    "",
    `_Snapshot for ${date}._`,
    "",
    `*Value:* ${formatMoney(summary.totalValue, summary.currency)}  `,
    `*Market value:* ${formatMoney(summary.marketValue, summary.currency)}  `,
    `*Cash:* ${formatMoney(summary.cashBalance, summary.currency)}  `,
    `*Total P&L:* ${formatSignedMoney(summary.unrealizedPnL, summary.currency)}`
  ].join("\n");
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "-");
}
