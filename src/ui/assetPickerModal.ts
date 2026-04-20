import { App, SuggestModal } from "obsidian";
import { Position } from "../domain/types";
import { formatMoney, formatPercent } from "../domain/money";

export class AssetPickerModal extends SuggestModal<Position> {
  constructor(
    app: App,
    private readonly positions: Position[],
    private readonly onChoose: (position: Position) => void | Promise<void>
  ) {
    super(app);
    this.setPlaceholder("Open asset note");
  }

  getSuggestions(query: string): Position[] {
    const normalized = query.toLowerCase();
    return this.positions.filter((position) => {
      return (
        position.ticker.toLowerCase().includes(normalized) ||
        position.assetId.toLowerCase().includes(normalized) ||
        (position.name?.toLowerCase().includes(normalized) ?? false)
      );
    });
  }

  renderSuggestion(position: Position, el: HTMLElement): void {
    el.createEl("div", {
      text: `${position.ticker} · ${position.name ?? position.assetType}`
    });
    el.createEl("small", {
      text: `${formatMoney(position.marketValue, position.currency)} · ${formatPercent(position.unrealizedPnLPct)}`
    });
  }

  onChooseSuggestion(position: Position): void {
    void this.onChoose(position);
  }
}
