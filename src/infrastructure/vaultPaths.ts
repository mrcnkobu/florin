import { App, TAbstractFile, TFile } from "obsidian";

export async function ensureFolder(app: App, folderPath: string): Promise<void> {
  const parts = folderPath.split("/").filter(Boolean);
  let current = "";

  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    const existing = app.vault.getAbstractFileByPath(current);
    if (!existing) {
      await app.vault.createFolder(current);
    }
  }
}

export async function ensureParentFolder(app: App, filePath: string): Promise<void> {
  const folderPath = filePath.split("/").slice(0, -1).join("/");
  if (folderPath) {
    await ensureFolder(app, folderPath);
  }
}

export function asTFile(file: TAbstractFile | null, path: string): TFile | null {
  if (!file) {
    return null;
  }

  if (file instanceof TFile) {
    return file;
  }

  throw new Error(`${path} exists but is not a file.`);
}
