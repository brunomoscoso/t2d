import { Page } from 'playwright';

import { JIRA_URL } from '../config/jira.config';

import { SELECTORS } from '../config/selectors';

import type { ExecutionData } from '../types/report.types';

import { extractTotalTests } from './totalTests.extractor';

import { extractExecutionStatuses } from './execution-status.extractor';

import { extractIssueLinks } from './issueLinks.extractor';

import { extractLabels } from './labels.extractor';

import { extractMainStatus } from './mainStatus.extractor';

// Extrai os dados usados pelos relatórios a partir de uma issue de execução.
export async function extractPrit(page: Page, prit: string): Promise<ExecutionData> {
  console.log('\n');

  console.log('========================================');

  console.log(`Abrindo ${prit}`);

  console.log('========================================');

  await page.goto(
    `${JIRA_URL}/browse/${prit}`,

    {
      waitUntil: 'domcontentloaded',
    },
  );

  await page.locator(SELECTORS.title).waitFor({
    state: 'visible',

    timeout: 60000,
  });

  const title = (await page.locator(SELECTORS.title).innerText()).trim();

  console.log(`Título: ${title}`);

  const mainStatus = await extractMainStatus(page);

  const labels = await extractLabels(page);

  console.log('Labels:', labels);

  const executionStatuses = await extractExecutionStatuses(page);

  const totalTests = await extractTotalTests(page);

  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });

  await page.waitForTimeout(1000);

  const issueLinks = await extractIssueLinks(page);

  return {
    prit,

    title,

    mainStatus,

    labels,

    totalTests,

    executionStatuses,

    issueLinks,
  };
}
