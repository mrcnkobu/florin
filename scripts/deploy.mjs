import { copyFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

const target = process.argv[2];

if (!target) {
  throw new Error("Usage: npm run deploy:test or npm run deploy:prod");
}

const config = JSON.parse(await readFile("florin.config.json", "utf8"));
const vaultPath = config.vaults?.[target];

if (!vaultPath) {
  throw new Error(`No vault configured for "${target}" in florin.config.json`);
}

const pluginId = config.pluginId ?? "florin";
const outputDir = join(vaultPath, ".obsidian", "plugins", pluginId);

await mkdir(outputDir, { recursive: true });

for (const file of ["main.js", "manifest.json", "styles.css"]) {
  await copyFile(file, join(outputDir, file));
}

console.log(`Deployed ${pluginId} to ${outputDir}`);
