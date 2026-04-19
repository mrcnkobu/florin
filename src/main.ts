import { Notice, Plugin } from "obsidian";
import { buildPortfolioSummary } from "./domain/portfolioEngine";
import { InvestmentTransaction, PortfolioSummary, FlorinSettings } from "./domain/types";
import { NoteWriter, openFile } from "./infrastructure/noteWriter";
import { TransactionStore } from "./infrastructure/transactionStore";
import { AddTransactionModal } from "./ui/addTransactionModal";
import { AssetPickerModal } from "./ui/assetPickerModal";
import { FlorinSettingTab, DEFAULT_SETTINGS } from "./settings";
import { formatDateInTimezone, formatDateTimeInTimezone } from "./domain/time";

export interface FlorinApi {
  addTransaction(transaction: InvestmentTransaction): Promise<PortfolioSummary>;
  getPortfolioSummary(): Promise<PortfolioSummary>;
  regenerateNotes(): Promise<PortfolioSummary>;
  snapshotToday(): Promise<string>;
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
      snapshotToday: async () => this.snapshotToday()
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
            broker: this.settings.defaultBroker
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
      id: "regenerate-notes",
      name: "Regenerate notes",
      callback: async () => {
        await this.regenerateNotes();
        new Notice("Florin notes regenerated.");
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
    await store.append(transaction);
    return this.regenerateNotes();
  }

  private async getPortfolioSummary(): Promise<PortfolioSummary> {
    const data = await this.getStore().load();
    return buildPortfolioSummary(data.transactions, {
      currency: this.settings.defaultCurrency,
      generatedAt: formatDateTimeInTimezone(new Date(), this.settings.timezone)
    });
  }

  private async regenerateNotes(): Promise<PortfolioSummary> {
    const data = await this.getStore().load();
    const summary = buildPortfolioSummary(data.transactions, {
      currency: this.settings.defaultCurrency,
      generatedAt: formatDateTimeInTimezone(new Date(), this.settings.timezone)
    });
    await this.getNoteWriter().writeAll(summary, data.transactions);
    return summary;
  }

  private async snapshotToday(): Promise<string> {
    const summary = await this.regenerateNotes();
    const date = formatDateInTimezone(new Date(), this.settings.timezone);
    return this.getNoteWriter().writeSnapshot(summary, date);
  }

  private getStore(): TransactionStore {
    return new TransactionStore(this.app, this.settings.dataFilePath);
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
}
