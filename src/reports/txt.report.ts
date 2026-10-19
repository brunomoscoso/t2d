import { PositionReport } from '../types/report.types';
import { JIRA_URL } from '../config/jira.config';
import { TEST_TYPE_LABELS } from '../config/test-types.config';

export function createTxtReport(positions: PositionReport[]): string {
  let txt = '';

  for (const position of positions) {
    if (!position.reports.length) continue;
    txt += '==================================================\n';

    txt += `${position.position}\n`;
    txt += `Test Plan: ${position.testPlanPrit ? `${position.testPlanPrit} — ${JIRA_URL}/browse/${position.testPlanPrit}` : 'Não informado'}\n`;

    txt += '==================================================\n\n';

    let currentType = '';
    for (const report of position.reports) {
      if (currentType !== report.testType) {
        currentType = report.testType;
        txt += `\nTipo de teste: ${TEST_TYPE_LABELS[report.testType]}\n\n`;
      }
      txt += `--------------------------------------------------\n`;

      txt += `${report.prit}\n`;

      txt += `${report.title}\n`;
      txt += `Status: ${report.mainStatus}\n`;
      txt += `Labels: ${report.labels.join(', ') || '—'}\n`;

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
