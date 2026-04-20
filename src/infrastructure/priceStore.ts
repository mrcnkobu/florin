import { App } from "obsidian";
import { PriceSnapshot, PriceStoreData } from "../domain/types";
import { ensureParentFolder } from "./vaultPaths";

export class PriceStore {
  constructor(
    private readonly app: App,
    private readonly pricesFilePath: string
  ) {}

  async load(): Promise<PriceStoreData> {
    const exists = await this.app.vault.adapter.exists(this.pricesFilePath);
    if (!exists) {
      return { version: 1, prices: [] };
    }

    const raw = await this.app.vault.adapter.read(this.pricesFilePath);
    const parsed = JSON.parse(raw) as PriceStoreData;

    if (parsed.version !== 1 || !Array.isArray(parsed.prices)) {
      throw new Error("Unsupported Florin price store format.");
    }

    return parsed;
  }

  async save(data: PriceStoreData): Promise<void> {
    await ensureParentFolder(this.app, this.pricesFilePath);
    await this.app.vault.adapter.write(this.pricesFilePath, `${JSON.stringify(data, null, 2)}\n`);
  }

  async upsert(price: PriceSnapshot): Promise<PriceStoreData> {
    const data = await this.load();
    const index = data.prices.findIndex((existing) => existing.assetId === price.assetId);

    if (index === -1) {
      data.prices.push(price);
    } else {
      data.prices[index] = price;
    }

    data.prices.sort((a, b) => a.assetId.localeCompare(b.assetId));
    await this.save(data);
    return data;
  }
}
