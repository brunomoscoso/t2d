export function normalizePrit(value: string): string {
  const trimmed = value.trim().toUpperCase();
  const prit = /^\d+$/.test(trimmed) ? `PRIT-${trimmed}` : trimmed;
  if (!/^[A-Z][A-Z0-9_]*-\d+$/.test(prit)) {
    throw new Error(`PRIT inválido: ${value}. Use 1234 ou uma chave no formato PROJETO-1234.`);
  }
  return prit;
}
