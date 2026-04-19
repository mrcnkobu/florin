import Decimal from "decimal.js";

Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP
});

export function d(value: Decimal.Value): Decimal {
  return new Decimal(value || 0);
}

export function toFixedMoney(value: Decimal.Value): string {
  return d(value).toDecimalPlaces(2).toFixed(2);
}

export function toFixedQuantity(value: Decimal.Value): string {
  const decimal = d(value).toDecimalPlaces(8);
  return decimal.toFixed().replace(/\.?0+$/, "");
}

export function toFixedPercent(value: Decimal.Value): string {
  return d(value).toDecimalPlaces(2).toFixed(2);
}

export function formatMoney(value: Decimal.Value, currency = "PLN"): string {
  const number = new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(d(value).toNumber());

  return `${number} ${currency}`;
}

export function formatSignedMoney(value: Decimal.Value, currency = "PLN"): string {
  const decimal = d(value);
  const sign = decimal.greaterThan(0) ? "+" : "";
  return `${sign}${formatMoney(decimal, currency)}`;
}

export function formatPercent(value: Decimal.Value): string {
  const decimal = d(value);
  const sign = decimal.greaterThan(0) ? "+" : "";
  const number = new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(decimal.toNumber());

  return `${sign}${number}%`;
}
