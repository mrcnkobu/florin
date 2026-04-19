import { App, Modal, Notice, Setting } from "obsidian";
import { InvestmentTransaction, AssetType, TransactionAction } from "../domain/types";
import { validateTransaction } from "../domain/validation";

export interface AddTransactionModalDefaults {
  currency: string;
  broker: string;
  date: string;
}

export class AddTransactionModal extends Modal {
  private ticker = "";
  private name = "";
  private assetType: AssetType = "stock";
  private action: TransactionAction = "buy";
  private date: string;
  private quantity = "1";
  private price = "0";
  private commission = "0";
  private broker: string;
  private currency: string;
  private note = "";
  private previewEl?: HTMLElement;
  private submitting = false;

  constructor(
    app: App,
    defaults: AddTransactionModalDefaults,
    private readonly onSubmit: (transaction: InvestmentTransaction) => Promise<void>
  ) {
    super(app);
    this.currency = defaults.currency;
    this.broker = defaults.broker;
    this.date = defaults.date;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Add transaction" });

    this.renderForm();
  }

  private renderForm(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Add transaction" });

    new Setting(contentEl).setName("Asset type").addDropdown((dropdown) =>
      dropdown
        .addOptions({
          stock: "Stock",
          etf: "ETF",
          bond: "Bond",
          cash: "Cash",
          other: "Other"
        })
        .setValue(this.assetType)
        .onChange((value) => {
          this.assetType = value as AssetType;
          this.normalizeForAction();
          this.renderForm();
        })
    );

    new Setting(contentEl).setName("Action").addDropdown((dropdown) =>
      dropdown
        .addOptions({
          buy: "Buy",
          sell: "Sell",
          dividend: "Dividend",
          interest: "Interest",
          fee: "Fee",
          tax: "Tax",
          deposit: "Deposit",
          withdrawal: "Withdrawal"
        })
        .setValue(this.action)
        .onChange((value) => {
          this.action = value as TransactionAction;
          this.normalizeForAction();
          this.renderForm();
        })
    );

    this.addText(this.isCashOnlyAction() ? "Reference" : "Ticker", this.ticker, (value) => {
      this.ticker = value.toUpperCase();
    });

    if (!this.isCashOnlyAction()) {
      this.addText("Name", this.name, (value) => {
        this.name = value;
      });
    }

    this.addText("Date", this.date, (value) => {
      this.date = value;
    });

    if (this.isAmountAction()) {
      this.addText("Amount", this.price, (value) => {
        this.price = value;
      });
    } else {
      this.addText("Quantity", this.quantity, (value) => {
        this.quantity = value;
      });
      this.addText("Price per unit", this.price, (value) => {
        this.price = value;
      });
      this.addText("Commission", this.commission, (value) => {
        this.commission = value;
      });
    }

    if (!this.isCashOnlyAction()) {
      this.addText("Broker", this.broker, (value) => {
        this.broker = value;
      });
    }

    this.addText("Note", this.note, (value) => {
      this.note = value;
    });

    this.previewEl = contentEl.createEl("p", {
      cls: "florin-transaction-preview",
      text: this.renderPreview()
    });

    new Setting(contentEl).addButton((button) =>
      button
        .setButtonText("Add transaction")
        .setCta()
        .onClick(async () => {
          await this.submit();
        })
    );
  }

  private addText(label: string, value: string, onChange: (value: string) => void): void {
    new Setting(this.contentEl).setName(label).addText((text) =>
      text.setValue(value).onChange((nextValue) => {
        onChange(nextValue.trim());
        this.updatePreview();
      })
    );
  }

  private async submit(): Promise<void> {
    if (this.submitting) {
      return;
    }

    const now = new Date().toISOString();
    const transaction: InvestmentTransaction = {
      id: crypto.randomUUID(),
      date: this.date,
      assetId: this.getAssetId(),
      ticker: this.getTicker(),
      name: this.name || undefined,
      assetType: this.getAssetType(),
      action: this.action,
      quantity: this.isAmountAction() ? "1" : this.quantity,
      price: this.price,
      commission: this.isAmountAction() ? "0" : this.commission || "0",
      currency: this.currency,
      broker: this.isCashOnlyAction() ? undefined : this.broker || undefined,
      note: this.note || undefined,
      source: "manual",
      createdAt: now,
      updatedAt: now
    };

    const errors = validateTransaction(transaction);
    if (errors.length > 0) {
      new Notice(errors.join(" "));
      return;
    }

    this.submitting = true;
    try {
      await this.onSubmit(transaction);
      this.close();
    } catch (error) {
      this.submitting = false;
      new Notice(error instanceof Error ? error.message : "Could not save transaction.");
    }
  }

  private normalizeForAction(): void {
    if (this.isCashOnlyAction()) {
      this.assetType = "cash";
      this.ticker = this.currency;
      this.quantity = "1";
      this.commission = "0";
      return;
    }

    if (this.isAmountAction()) {
      this.quantity = "1";
      this.commission = "0";
    }
  }

  private isAmountAction(): boolean {
    return ["deposit", "withdrawal", "dividend", "interest", "fee", "tax"].includes(this.action);
  }

  private isCashOnlyAction(): boolean {
    return ["deposit", "withdrawal", "fee", "tax"].includes(this.action);
  }

  private getTicker(): string {
    if (this.isCashOnlyAction()) {
      return this.currency;
    }

    return this.ticker;
  }

  private getAssetId(): string {
    if (this.isCashOnlyAction()) {
      return `CASH.${this.currency}`;
    }

    return this.ticker;
  }

  private getAssetType(): AssetType {
    if (this.isCashOnlyAction()) {
      return "cash";
    }

    return this.assetType;
  }

  private renderPreview(): string {
    if (this.isAmountAction()) {
      return `${this.action} · ${this.getTicker() || "_ticker_"} · ${this.price || "0"} ${this.currency}`;
    }

    return `${this.action} · ${this.getTicker() || "_ticker_"} · ${this.quantity || "0"} × ${
      this.price || "0"
    } ${this.currency} + ${this.commission || "0"} commission`;
  }

  private updatePreview(): void {
    if (this.previewEl) {
      this.previewEl.setText(this.renderPreview());
    }
  }
}
