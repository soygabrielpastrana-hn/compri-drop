// Lógica pura del checkout dividido (sin base de datos).
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Reparte un monto entre bloques según su peso (el último absorbe el redondeo).
export function splitAmount(amount, weights) {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  let left = round2(amount);
  return weights.map((w, i) => {
    const v = i === weights.length - 1 ? left : round2((amount * w) / sum);
    left = round2(left - v);
    return v;
  });
}

// Agrupa las líneas por método de pago:
//  - "Solo transferencia" y "solo contra entrega" no pueden ir juntos → 2 bloques (A = Transferencia, B = Contra Entrega)
//  - Los productos que aceptan ambos siguen el método preferido del cliente (por defecto Contra Entrega)
export function planBlocks(lines, preferred) {
  const onlyT = lines.filter((l) => !l.product.payment.cod && l.product.payment.transfer);
  const onlyC = lines.filter((l) => l.product.payment.cod && !l.product.payment.transfer);
  const flex = lines.filter((l) => l.product.payment.cod && l.product.payment.transfer);
  const pref = preferred === 'Transferencia' ? 'Transferencia' : 'Contra Entrega';

  if (onlyT.length && onlyC.length) {
    return [
      { key: 'A', method: 'Transferencia', lines: [...onlyT, ...(pref === 'Transferencia' ? flex : [])] },
      { key: 'B', method: 'Contra Entrega', lines: [...onlyC, ...(pref === 'Contra Entrega' ? flex : [])] },
    ];
  }
  const method = onlyT.length ? 'Transferencia' : onlyC.length ? 'Contra Entrega' : pref;
  return [{ key: 'A', method, lines }];
}
