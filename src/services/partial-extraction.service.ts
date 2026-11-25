import type { ExecutionData } from '../types/report.types';

export const extractionFields = [
  'title',
  'mainStatus',
  'fixVersions',
  'totalTests',
  'executionStatuses',
  'issueLinks',
] as const;
export type ExtractionField = (typeof extractionFields)[number];

export function unavailableExecution(prit: string, message: string): ExecutionData {
  return {
    prit,
    title: 'Título indisponível',
    mainStatus: 'UNKNOWN',
    totalTests: null,
    executionStatuses: [],
    issueLinks: [],
    collectedAt: new Date().toISOString(),
    extractionWarnings: extractionFields.map((field) => ({ field, message })),
  };
}

// A falha de um campo não impede a tentativa dos restantes.
export async function collectExecutionFields(
  prit: string,
  readers: { [K in ExtractionField]: () => Promise<ExecutionData[K]> },
): Promise<ExecutionData> {
  const result = unavailableExecution(prit, '');
  result.extractionWarnings = [];
  for (const field of extractionFields) {
    try {
      const value = await readers[field]();
      Object.assign(result, { [field]: value });
    } catch (error) {
      result.extractionWarnings.push({
        field,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  if (!result.extractionWarnings.length) delete result.extractionWarnings;
  return result;
}
