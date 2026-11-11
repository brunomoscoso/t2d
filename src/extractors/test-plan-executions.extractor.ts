import type { Page } from 'playwright';
import { JIRA_URL } from '../config/jira.config';
import { SELECTORS } from '../config/selectors';
import type { TestType } from '../types/report.types';
import { normalizePrit } from '../utils/prit.utils';

export type TestPlanExecution = {
  prit: string;
  title: string;
  testType: TestType;
};

const testTypePatterns: [TestType, RegExp][] = [
  ['smoke', /\bsmoke\b/i],
  ['regression', /\bregression\b/i],
  ['certification', /\bcertification\b/i],
  ['defectFixing', /\bdefect[\s_-]*fixing\b/i],
];

export function identifyTestType(title: string): TestType | undefined {
  const normalizedTitle = title.replace(/[_-]+/g, ' ');
  const matches = testTypePatterns
    .filter(([, pattern]) => pattern.test(normalizedTitle))
    .map(([testType]) => testType);

  if (matches.length > 1) {
    throw new Error(`O título identifica mais de um tipo de teste: "${title}".`);
  }

  return matches[0];
}

export async function extractTestPlanExecutions(
  page: Page,
  testPlanPrit: string,
  jiraUrl = JIRA_URL,
): Promise<TestPlanExecution[]> {
  const plan = normalizePrit(testPlanPrit);
  const baseUrl = jiraUrl.replace(/\/+$/, '');

  await page.goto(`${baseUrl}/browse/${plan}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.locator(SELECTORS.title).waitFor({ state: 'visible', timeout: 90000 });
  const table = page.locator(SELECTORS.testPlanExecutions.table);
  await table.waitFor({ state: 'visible', timeout: 30000 });
  const rows = await table.locator('tbody tr').evaluateAll(
    (elements, selectors) =>
      elements.flatMap((row) => {
        const pritElement = row.querySelector<HTMLElement>(selectors.prit);
        const summaryElement = row.querySelector<HTMLElement>(selectors.summary);
        if (!pritElement && !summaryElement) return [];

        const pritValue =
          pritElement?.getAttribute('href') ??
          pritElement?.getAttribute('data-issue-key') ??
          pritElement?.textContent ??
          '';
        const prit = pritValue.match(/(?:\/browse\/)?(PRIT-\d+)/i)?.[1]?.toUpperCase();
        if (!prit) {
          throw new Error(
            `Não foi possível identificar o PRIT em uma linha da tabela ${selectors.table}.`,
          );
        }

        const title = (summaryElement?.textContent ?? '').trim();
        return [{ prit, title }];
      }),
    SELECTORS.testPlanExecutions,
  );
  if (!rows.length) {
    throw new Error(
      `${plan}: a tabela ${SELECTORS.testPlanExecutions.table} não contém execuções.`,
    );
  }

  const seen = new Map<string, TestPlanExecution>();
  for (const row of rows) {
    if (!row.title) {
      throw new Error(`${plan}: não foi possível ler o título da execução ${row.prit}.`);
    }
    const testType = identifyTestType(row.title);
    if (!testType) {
      throw new Error(
        `${plan}: o título da execução ${row.prit} não contém Smoke, Regression, Certification ou Defect Fixing: "${row.title}".`,
      );
    }

    const execution = { prit: normalizePrit(row.prit), title: row.title, testType };
    const previous = seen.get(execution.prit);
    if (
      previous &&
      (previous.title !== execution.title || previous.testType !== execution.testType)
    ) {
      throw new Error(
        `${plan}: a execução ${execution.prit} aparece com títulos diferentes na tabela.`,
      );
    }
    seen.set(execution.prit, execution);
  }

  return [...seen.values()];
}
