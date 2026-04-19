import { App } from "obsidian";
import { InvestmentTransaction, TransactionStoreData } from "../domain/types";
import { ensureParentFolder } from "./vaultPaths";

export class TransactionStore {
  constructor(
    private readonly app: App,
    private readonly dataFilePath: string
  ) {}

  async load(): Promise<TransactionStoreData> {
    const exists = await this.app.vault.adapter.exists(this.dataFilePath);
    if (!exists) {
      return { version: 1, transactions: [] };
    }

    const raw = await this.app.vault.adapter.read(this.dataFilePath);
    const parsed = JSON.parse(raw) as TransactionStoreData;

    if (parsed.version !== 1 || !Array.isArray(parsed.transactions)) {
      throw new Error("Unsupported Florin transaction store format.");
    }

    return parsed;
  }

  async save(data: TransactionStoreData): Promise<void> {
    await ensureParentFolder(this.app, this.dataFilePath);
    await this.app.vault.adapter.write(this.dataFilePath, `${JSON.stringify(data, null, 2)}\n`);
  }

  async append(transaction: InvestmentTransaction): Promise<TransactionStoreData> {
    const data = await this.load();
    data.transactions.push(transaction);
    await this.save(data);
    return data;
  }
}
