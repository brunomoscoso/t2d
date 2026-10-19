import type { TestType } from '../types/report.types';

// Ordem explícita de apresentação, independente dos títulos do Jira.
export const TEST_TYPES: TestType[] = ['smoke', 'regression', 'certification', 'defectFixing'];

export const TEST_TYPE_LABELS: Record<TestType, string> = {
  smoke: 'Smoke',
  regression: 'Regressão',
  certification: 'Certificação',
  defectFixing: 'Defect Fixing',
};
