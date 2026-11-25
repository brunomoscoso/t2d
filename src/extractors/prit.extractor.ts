import type { Page } from 'playwright';
import { JIRA_URL } from '../config/jira.config';
import { SELECTORS } from '../config/selectors';
import type { ExecutionData } from '../types/report.types';
import { extractTotalTests } from './totalTests.extractor';
import { extractExecutionStatuses } from './execution-status.extractor';
import { extractIssueLinks } from './issueLinks.extractor';
import { extractMainStatus } from './mainStatus.extractor';
import { extractFixVersions } from './fix-versions.extractor';
import { collectExecutionFields } from '../services/partial-extraction.service';
import {
  dataDifferences,
  readExpectedExecution,
  waitForVerifiedData,
  UnverifiedExtractionError,
} from '../services/extraction-verification.service';

export async function extractPrit(page: Page, prit: string): Promise<ExecutionData> {
  console.log(`Abrindo ${prit}; a confirmar dados com Jira/Xray.`);
  let expected: ExecutionData | undefined;
  let verificationError = '';
  try {
    expected = await readExpectedExecution(page.request, JIRA_URL, prit);
  } catch (error) {
    verificationError = error instanceof Error ? error.message : String(error);
  }
  await page.goto(`${JIRA_URL}/browse/${prit}`, { waitUntil: 'load', timeout: 60000 });
  await page.locator(SELECTORS.title).waitFor({ state: 'visible', timeout: 90000 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const read = () =>
    collectExecutionFields(prit, {
      title: async () => (await page.locator(SELECTORS.title).innerText()).trim(),
      mainStatus: async () => {
        const value = await extractMainStatus(page);
        if (value === 'UNKNOWN') throw new Error('Estado principal indisponível.');
        return value;
      },
      fixVersions: () => extractFixVersions(page),
      executionStatuses: async () => {
        const value = await extractExecutionStatuses(page);
        if (!value.length) throw new Error('Estados Xray indisponíveis.');
        return value;
      },
      totalTests: async () => {
        const value = await extractTotalTests(page);
        if (value === null) throw new Error('Total de testes indisponível.');
        return value;
      },
      issueLinks: () => extractIssueLinks(page),
    });
  let report: ExecutionData;
  if (!expected) {
    report = await read();
    (report.extractionWarnings ??= []).push({
      field: 'verification',
      message: `Dados lidos, mas completude não confirmada: ${verificationError}`,
    });
    return report;
  }
  try {
    report = await waitForVerifiedData(expected, read);
  } catch (error) {
    if (!(error instanceof UnverifiedExtractionError)) throw error;
    report = error.data;
    for (const field of error.fields) {
      if (!report.extractionWarnings?.some((warning) => warning.field === field)) {
        (report.extractionWarnings ??= []).push({
          field,
          message: 'Dados da página não coincidem com o servidor; podem estar incompletos.',
        });
      }
    }
    return report;
  }
  try {
    const latest = await readExpectedExecution(page.request, JIRA_URL, prit);
    for (const field of dataDifferences(latest, report)) {
      (report.extractionWarnings ??= []).push({
        field,
        message: 'O servidor mudou durante a recolha; este campo não foi confirmado.',
      });
    }
  } catch (error) {
    (report.extractionWarnings ??= []).push({
      field: 'verification',
      message: `Não foi possível reconfirmar os dados: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
  return report;
}
