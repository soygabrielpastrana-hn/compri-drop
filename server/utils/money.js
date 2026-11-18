export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
export const fmt = (n) =>
  `L ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
