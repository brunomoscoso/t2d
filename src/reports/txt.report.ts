import { PositionReport } from '../types/report.types';

export function createTxtReport(positions: PositionReport[]): string {
  let txt = '';

  for (const position of positions) {
    txt += '==================================================\n';

    txt += `${position.position}\n`;

    txt += '==================================================\n\n';

    for (const report of position.reports) {
      txt += `--------------------------------------------------\n`;

      txt += `${report.prit}\n`;

      txt += `${report.title}\n`;

      txt += `--------------------------------------------------\n`;

      txt += `Total Tests: ${report.totalTests ?? '-'}\n\n`;

      txt += 'Execution Status:\n';

      for (const item of report.executionStatuses) {
        txt += `${item.status}: ${item.quantidade}\n`;
      }

      txt += '\nIssue Links:\n';

      const relations = [...new Set(report.issueLinks.map((issue) => issue.relation))];

      for (const relation of relations) {
        txt += `\n${relation}\n`;

        const issues = report.issueLinks.filter((issue) => issue.relation === relation);

        for (const issue of issues) {
          txt += `${issue.prit} | ${issue.titulo} | ${issue.status}\n`;
        }
      }

      txt += '\n\n';
    }
  }

  return txt;
}
