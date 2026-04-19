# Florin

Florin is a text-first Obsidian investment keeper. It stores investment records locally,
calculates positions with FIFO, and renders readable Markdown portfolio notes.

## Principles

- `transactions.json` is the source of truth.
- Markdown files are generated projections.
- Generated sections are managed between `<!-- florin:start -->` and `<!-- florin:end -->`.
- User notes outside managed sections are never overwritten.
- The plugin remains useful without network access.

## v1 Scope

- Add manual transactions.
- Track deposits, withdrawals, buys, sells, dividends, interest, fees, and taxes.
- Calculate open positions and realized P&L using FIFO.
- Generate `Portfolio.md`, `Transactions.md`, and asset notes.
- Snapshot portfolio value to a daily/fallback snapshot note.

## Development

Install dependencies:

```bash
npm install
```

Run checks:

```bash
npm run check
```

Build:

```bash
npm run build
```

Copy `florin.config.example.json` to `florin.config.json`, set vault paths, then deploy:

```bash
npm run deploy:test
npm run deploy:prod
```

## Obsidian CLI Ideas

Once loaded in Obsidian, commands can be called through the Obsidian CLI:

```bash
obsidian command id="florin:open-portfolio"
obsidian command id="florin:regenerate-notes"
obsidian command id="florin:snapshot-today"
```

The plugin also exposes a programmatic API:

```bash
obsidian eval code="await app.plugins.plugins['florin'].api.regenerateNotes()"
obsidian eval code="JSON.stringify(await app.plugins.plugins['florin'].api.getPortfolioSummary())"
```

## Disclaimer

Florin is a personal record-keeping and estimation tool. It is not financial, tax, legal,
or accounting advice.
