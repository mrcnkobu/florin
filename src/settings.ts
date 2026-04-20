import { App, PluginSettingTab, Setting } from "obsidian";
import FlorinPlugin from "./main";
import { FlorinSettings } from "./domain/types";
import { isValidTimezone } from "./domain/time";

export const DEFAULT_SETTINGS: FlorinSettings = {
  portfolioNotePath: "Investments/Portfolio.md",
  transactionsNotePath: "Investments/Transactions.md",
  assetsFolderPath: "Investments/Assets",
  snapshotsFolderPath: "Investments/Snapshots",
  dataFilePath: "Investments/.data/transactions.json",
  pricesFilePath: "Investments/.data/prices.json",
  defaultCurrency: "PLN",
  defaultBroker: "XTB",
  dateFormat: "YYYY-MM-DD",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  dailyNotePathPattern: "Daily/yyyy-mm/yyyy-mm-dd_ddd.md",
  dailyNoteWeekdayLocale: "en-GB"
};

export class FlorinSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: FlorinPlugin
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Florin" });

    new Setting(containerEl)
      .setName("Portfolio note path")
      .setDesc("Generated portfolio summary note.")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.portfolioNotePath)
          .onChange(async (value) => {
            this.plugin.settings.portfolioNotePath = value.trim() || DEFAULT_SETTINGS.portfolioNotePath;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Transactions note path")
      .setDesc("Generated transaction ledger note.")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.transactionsNotePath)
          .onChange(async (value) => {
            this.plugin.settings.transactionsNotePath =
              value.trim() || DEFAULT_SETTINGS.transactionsNotePath;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Assets folder path")
      .setDesc("Folder for generated asset notes.")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.assetsFolderPath)
          .onChange(async (value) => {
            this.plugin.settings.assetsFolderPath = value.trim() || DEFAULT_SETTINGS.assetsFolderPath;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Data file path")
      .setDesc("Canonical JSON transaction store.")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.dataFilePath)
          .onChange(async (value) => {
            this.plugin.settings.dataFilePath = value.trim() || DEFAULT_SETTINGS.dataFilePath;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Prices file path")
      .setDesc("Local price snapshots used for valuation.")
      .addText((text) =>
        text.setValue(this.plugin.settings.pricesFilePath).onChange(async (value) => {
          this.plugin.settings.pricesFilePath = value.trim() || DEFAULT_SETTINGS.pricesFilePath;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Default currency")
      .addText((text) =>
        text.setValue(this.plugin.settings.defaultCurrency).onChange(async (value) => {
          this.plugin.settings.defaultCurrency = value.trim().toUpperCase() || "PLN";
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Default broker")
      .addText((text) =>
        text.setValue(this.plugin.settings.defaultBroker).onChange(async (value) => {
          this.plugin.settings.defaultBroker = value.trim();
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Timezone")
      .setDesc("Used for generated timestamps and snapshot dates, for example Europe/Warsaw.")
      .addText((text) =>
        text.setValue(this.plugin.settings.timezone).onChange(async (value) => {
          const timezone = value.trim();
          this.plugin.settings.timezone = isValidTimezone(timezone)
            ? timezone
            : DEFAULT_SETTINGS.timezone;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Daily note path pattern")
      .setDesc("Used by Snapshot today. Example: Daily/yyyy-mm/yyyy-mm-dd_ddd.md")
      .addText((text) =>
        text.setValue(this.plugin.settings.dailyNotePathPattern).onChange(async (value) => {
          this.plugin.settings.dailyNotePathPattern = value.trim();
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Daily note weekday locale")
      .setDesc("Controls the ddd token, for example en-GB gives Mon and pl-PL gives pon.")
      .addText((text) =>
        text.setValue(this.plugin.settings.dailyNoteWeekdayLocale).onChange(async (value) => {
          this.plugin.settings.dailyNoteWeekdayLocale =
            value.trim() || DEFAULT_SETTINGS.dailyNoteWeekdayLocale;
          await this.plugin.saveSettings();
        })
      );
  }
}
