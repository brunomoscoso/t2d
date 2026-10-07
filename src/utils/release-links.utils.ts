export function normalizeTestPlanPrit(value: string): string {
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return '';
  const prit = /^\d+$/.test(trimmed) ? `PRIT-${trimmed}` : trimmed;
  if (!/^PRIT-\d+$/.test(prit)) {
    throw new Error(`PRIT inválido no Test Plan: ${value}. Use 1234 ou PRIT-1234.`);
  }
  return prit;
}
