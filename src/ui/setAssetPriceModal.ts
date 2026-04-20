import { App, Modal, Notice, Setting } from "obsidian";
import { d } from "../domain/money";
import { Position, PriceSnapshot } from "../domain/types";

export interface SetAssetPriceModalDefaults {
  currency: string;
  updatedAt: string;
}

export class SetAssetPriceModal extends Modal {
  private price: string;
  private currency: string;

  constructor(
    app: App,
    private readonly position: Position,
    defaults: SetAssetPriceModalDefaults,
    private readonly onSubmit: (price: PriceSnapshot) => Promise<void>
  ) {
    super(app);
    this.price = position.lastPrice;
    this.currency = defaults.currency;
    this.updatedAt = defaults.updatedAt;
  }

  private readonly updatedAt: string;

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Set asset price" });
    contentEl.createEl("p", {
      text: `${this.position.ticker} · ${this.position.name ?? this.position.assetType}`
    });

    new Setting(contentEl).setName("Price").addText((text) =>
      text.setValue(this.price).onChange((value) => {
        this.price = value.trim();
      })
    );

    new Setting(contentEl).setName("Currency").addText((text) =>
      text.setValue(this.currency).onChange((value) => {
        this.currency = value.trim().toUpperCase();
      })
    );

    new Setting(contentEl).addButton((button) =>
      button
        .setButtonText("Save price")
        .setCta()
        .onClick(() => {
          void this.submit();
        })
    );
  }

  private async submit(): Promise<void> {
    if (d(this.price).lessThanOrEqualTo(0)) {
      new Notice("Price must be greater than zero.");
      return;
    }

    if (!this.currency) {
      new Notice("Currency is required.");
      return;
    }

    await this.onSubmit({
      assetId: this.position.assetId,
      price: d(this.price).toDecimalPlaces(2).toFixed(2),
      currency: this.currency,
      source: "manual",
      updatedAt: this.updatedAt
    });
    this.close();
  }
}
