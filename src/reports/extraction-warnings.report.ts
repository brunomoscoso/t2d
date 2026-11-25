import type { PositionReport } from '../types/report.types';
import { escapeHtml } from '../utils/html.utils';

const labels: Record<string, string> = {
  title: 'Título',
  mainStatus: 'Estado principal',
  fixVersions: 'Fix Version/s',
  totalTests: 'Total de testes',
  executionStatuses: 'Estados Xray',
  issueLinks: 'Issues associadas',
  verification: 'Confirmação da completude',
};

export function extractionWarningLines(
  positions: PositionReport[],
  runWarnings: string[] = [],
): string[] {
  return [
    ...runWarnings,
    ...positions.flatMap((position) => [
      ...(position.extractionWarnings ?? []).map((message) => `${position.position}: ${message}`),
      ...position.reports.flatMap((report) =>
        (report.extractionWarnings ?? []).map(
          (warning) =>
            `${position.position} / ${report.prit} — ${labels[warning.field] ?? warning.field}: ${warning.message}`,
        ),
      ),
    ]),
  ];
}

export function createExtractionWarningsSection(
  positions: PositionReport[],
  runWarnings: string[] = [],
): string {
  const lines = extractionWarningLines(positions, runWarnings);
  if (!lines.length) return '';
  return `<section data-extraction-warnings style="border:2px solid #b65c00;background:#fff7e6;color:#663c00;padding:16px;margin:16px 0;font-family:Arial,sans-serif;">
    <h2 style="font-size:16px;margin:0 0 8px;">Relatório parcial — dados não extraídos ou não confirmados</h2>
    <p>Os dados disponíveis foram preservados. Campos indisponíveis não significam zero testes ou ausência de defeitos. Os agregados afetados estão indisponíveis.</p>
    <ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul></section>`;
}
