export function normalizePrit(value: string): string {
  const trimmed = value.trim().toUpperCase();
  const prit = /^\d+$/.test(trimmed) ? `PRIT-${trimmed}` : trimmed;
  if (!/^PRIT-\d+$/.test(prit)) {
    throw new Error(`PRIT inválido: ${value}. Use 1234 ou PRIT-1234.`);
  }
  return prit;
}
