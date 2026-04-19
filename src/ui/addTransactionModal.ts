import { App, Modal, Notice, Setting } from "obsidian";
import { InvestmentTransaction, AssetType, TransactionAction } from "../domain/types";
import { validateTransaction } from "../domain/validation";

export interface AddTransactionModalDefaults {
  currency: string;
  broker: string;
}

export class AddTransactionModal extends Modal {
  private ticker = "";
  private name = "";
  private assetType: AssetType = "stock";
  private action: TransactionAction = "buy";
  private date = new Date().toISOString().slice(0, 10);
  private quantity = "1";
  private price = "0";
  private commission = "0";
  private broker: string;
  private note = "";
  private submitting = false;

  constructor(
    app: App,
    defaults: AddTransactionModalDefaults,
    private readonly onSubmit: (transaction: InvestmentTransaction) => Promise<void>
  ) {
    super(app);
    this.broker = defaults.broker;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Add transaction" });

    this.addText("Ticker", this.ticker, (value) => {
      this.ticker = value.toUpperCase();
    });
    this.addText("Name", this.name, (value) => {
      this.name = value;
    });

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
        })
    );

    this.addText("Date", this.date, (value) => {
      this.date = value;
    });
    this.addText("Quantity", this.quantity, (value) => {
      this.quantity = value;
    });
    this.addText("Price", this.price, (value) => {
      this.price = value;
    });
    this.addText("Commission", this.commission, (value) => {
      this.commission = value;
    });
    this.addText("Broker", this.broker, (value) => {
      this.broker = value;
    });
    this.addText("Note", this.note, (value) => {
      this.note = value;
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
      assetId: this.ticker,
      ticker: this.ticker,
      name: this.name || undefined,
      assetType: this.assetType,
      action: this.action,
      quantity: this.quantity,
      price: this.price,
      commission: this.commission || "0",
      currency: "PLN",
      broker: this.broker || undefined,
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
    await this.onSubmit(transaction);
    this.close();
  }
}
