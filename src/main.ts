import { Notice, Plugin } from "obsidian";
import { buildPortfolioSummary } from "./domain/portfolioEngine";
import { InvestmentTransaction, PortfolioSummary, FlorinSettings, PriceSnapshot } from "./domain/types";
import { NoteWriter, openFile } from "./infrastructure/noteWriter";
import { TransactionStore } from "./infrastructure/transactionStore";
import { PriceStore } from "./infrastructure/priceStore";
import { AddTransactionModal } from "./ui/addTransactionModal";
import { AssetPickerModal } from "./ui/assetPickerModal";
import { SetAssetPriceModal } from "./ui/setAssetPriceModal";
import { FlorinSettingTab, DEFAULT_SETTINGS } from "./settings";
import { formatDateInTimezone, formatDatePattern, formatDateTimeInTimezone } from "./domain/time";
import { LedgerValidationReport, validateLedger, validateNewTransaction } from "./domain/validation";
import { StooqFetchResult, fetchStooqPrices } from "./integrations/stooq";

export interface FlorinApi {
  addTransaction(transaction: InvestmentTransaction): Promise<PortfolioSummary>;
  getPortfolioSummary(): Promise<PortfolioSummary>;
  regenerateNotes(): Promise<PortfolioSummary>;
  snapshotToday(): Promise<string>;
  validateData(): Promise<LedgerValidationReport>;
  setAssetPrice(price: PriceSnapshot): Promise<PortfolioSummary>;
  refreshPrices(): Promise<StooqFetchResult>;
}

export default class FlorinPlugin extends Plugin {
  settings: FlorinSettings = DEFAULT_SETTINGS;
  api!: FlorinApi;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.api = {
      addTransaction: async (transaction) => this.addTransaction(transaction),
      getPortfolioSummary: async () => this.getPortfolioSummary(),
      regenerateNotes: async () => this.regenerateNotes(),
      snapshotToday: async () => this.snapshotToday(),
      validateData: async () => this.validateData(),
      setAssetPrice: async (price) => this.setAssetPrice(price),
      refreshPrices: async () => this.refreshPrices()
    };

    this.addSettingTab(new FlorinSettingTab(this.app, this));
    this.registerCommands();
  }

  async loadSettings(): Promise<void> {
    const loaded = (await this.loadData()) as Partial<FlorinSettings> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...(loaded ?? {}) };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private registerCommands(): void {
    this.addCommand({
      id: "add-transaction",
      name: "Add transaction",
      callback: () => {
        new AddTransactionModal(
          this.app,
          {
            currency: this.settings.defaultCurrency,
            broker: this.settings.defaultBroker,
            date: formatDateInTimezone(new Date(), this.settings.timezone)
          },
          async (transaction) => {
            await this.addTransaction({
              ...transaction,
              currency: this.settings.defaultCurrency
            });
            new Notice(`${transaction.action} · ${transaction.ticker} · ${transaction.quantity}`);
          }
        ).open();
      }
    });

    this.addCommand({
      id: "open-portfolio",
      name: "Open portfolio",
      callback: async () => {
        await this.regenerateNotes();
        await openFile(this.app, this.settings.portfolioNotePath);
      }
    });

    this.addCommand({
      id: "open-transactions",
      name: "Open transactions",
      callback: async () => {
        await this.regenerateNotes();
        await openFile(this.app, this.settings.transactionsNotePath);
      }
    });

    this.addCommand({
      id: "open-asset-note",
      name: "Open asset note",
      callback: async () => {
        const summary = await this.regenerateNotes();
        if (summary.positions.length === 0) {
          new Notice("No assets found. Add a transaction first.");
          return;
        }

        new AssetPickerModal(this.app, summary.positions, async (position) => {
          await openFile(
            this.app,
            `${this.settings.assetsFolderPath}/${position.assetId.replace(/[\\/:*?"<>|]/g, "-")}.md`
          );
        }).open();
      }
    });

    this.addCommand({
      id: "set-asset-price",
      name: "Set asset price",
      callback: async () => {
        const summary = await this.getPortfolioSummary();
        if (summary.positions.length === 0) {
          new Notice("No open positions found.");
          return;
        }

        new AssetPickerModal(this.app, summary.positions, (position) => {
          new SetAssetPriceModal(
            this.app,
            position,
            {
              currency: position.currency || this.settings.defaultCurrency,
              updatedAt: formatDateTimeInTimezone(new Date(), this.settings.timezone)
            },
            async (price) => {
              await this.setAssetPrice(price);
              new Notice(`Price saved · ${position.ticker} · ${price.price} ${price.currency}`);
            }
          ).open();
        }).open();
      }
    });

    this.addCommand({
      id: "refresh-prices",
      name: "Refresh prices",
      callback: async () => {
        const result = await this.refreshPrices();
        const failed = result.failures.length > 0 ? ` · ${result.failures.length} failed` : "";
        new Notice(`Prices updated · ${result.prices.length} fetched${failed}`);
      }
    });

    this.addCommand({
      id: "regenerate-notes",
      name: "Regenerate notes",
      callback: async () => {
        await this.regenerateNotes();
        new Notice("Florin notes regenerated.");
      }
    });

    this.addCommand({
      id: "validate-data",
      name: "Validate data",
      callback: async () => {
        const report = await this.validateData();
        if (report.issues.length === 0) {
          new Notice("Florin data looks clean.");
          return;
        }

        console.table(report.issues);
        new Notice(
          `Florin found ${report.errorCount} errors and ${report.warningCount} warnings. See developer console for details.`
        );
      }
    });

    this.addCommand({
      id: "snapshot-today",
      name: "Snapshot today",
      callback: async () => {
        const path = await this.snapshotToday();
        new Notice(`Snapshot saved to ${path}`);
      }
    });
  }

  private async addTransaction(transaction: InvestmentTransaction): Promise<PortfolioSummary> {
    const store = this.getStore();
    const data = await store.load();
    const errors = validateNewTransaction(data.transactions, transaction);

    if (errors.length > 0) {
      throw new Error(errors.join(" "));
    }

    if (transaction.broker && transaction.broker !== this.settings.defaultBroker) {
      this.settings.defaultBroker = transaction.broker;
      await this.saveSettings();
    }

    await store.append(transaction);
    return this.regenerateNotes();
  }

  private async getPortfolioSummary(): Promise<PortfolioSummary> {
    const data = await this.getStore().load();
    const prices = await this.getPriceStore().load();
    return buildPortfolioSummary(data.transactions, {
      currency: this.settings.defaultCurrency,
      generatedAt: formatDateTimeInTimezone(new Date(), this.settings.timezone),
      prices: prices.prices
    });
  }

  private async regenerateNotes(): Promise<PortfolioSummary> {
    const data = await this.getStore().load();
    const prices = await this.getPriceStore().load();
    const summary = buildPortfolioSummary(data.transactions, {
      currency: this.settings.defaultCurrency,
      generatedAt: formatDateTimeInTimezone(new Date(), this.settings.timezone),
      prices: prices.prices
    });
    await this.getNoteWriter().writeAll(summary, data.transactions);
    return summary;
  }

  private async snapshotToday(): Promise<string> {
    const summary = await this.regenerateNotes();
    const now = new Date();
    const date = formatDateInTimezone(now, this.settings.timezone);
    const dailyPath = this.getDailyNotePath(now);

    if (dailyPath) {
      return this.getNoteWriter().writeDailySnapshot(summary, dailyPath, date);
    }

    return this.getNoteWriter().writeSnapshot(summary, date);
  }

  private async validateData(): Promise<LedgerValidationReport> {
    const data = await this.getStore().load();
    return validateLedger(data.transactions);
  }

  private async setAssetPrice(price: PriceSnapshot): Promise<PortfolioSummary> {
    await this.getPriceStore().upsert(price);
    return this.regenerateNotes();
  }

  private async refreshPrices(): Promise<StooqFetchResult> {
    const summary = await this.getPortfolioSummary();
    const result = await fetchStooqPrices(
      summary.positions,
      formatDateTimeInTimezone(new Date(), this.settings.timezone)
    );
    const priceStore = this.getPriceStore();

    for (const price of result.prices) {
      await priceStore.upsert(price);
    }

    if (result.prices.length > 0) {
      await this.regenerateNotes();
    }

    if (result.failures.length > 0) {
      console.warn("Florin price refresh failures:", result.failures);
    }

    return result;
  }

  private getStore(): TransactionStore {
    return new TransactionStore(this.app, this.settings.dataFilePath);
  }

  private getPriceStore(): PriceStore {
    return new PriceStore(this.app, this.settings.pricesFilePath);
  }

  private getNoteWriter(): NoteWriter {
    return new NoteWriter(this.app, {
      portfolioNotePath: this.settings.portfolioNotePath,
      transactionsNotePath: this.settings.transactionsNotePath,
      assetsFolderPath: this.settings.assetsFolderPath,
      snapshotsFolderPath: this.settings.snapshotsFolderPath,
      timezone: this.settings.timezone
    });
  }

  private getDailyNotePath(date: Date): string | null {
    const pattern = this.settings.dailyNotePathPattern.trim();
    if (!pattern) {
      return null;
    }

    const path = formatDatePattern(
      date,
      this.settings.timezone,
      pattern,
      this.settings.dailyNoteWeekdayLocale
    );

    return path.endsWith(".md") ? path : `${path}.md`;
  }
}
