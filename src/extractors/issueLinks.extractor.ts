import { Locator, Page } from 'playwright';

import { SELECTORS } from '../config/selectors';

import { IssueLink } from '../types/report.types';

/* =========================================================
    NORMALIZA PRIORIDADE
    ========================================================= */

function parsePriority(value: string): string | null {
  const match = value.match(/\b(Highest|High|Medium|Lowest|Low)\b/i);

  if (!match) {
    return null;
  }

  const priority = match[1].toLowerCase();

  if (priority === 'highest') {
    return 'Highest';
  }

  if (priority === 'high') {
    return 'High';
  }

  if (priority === 'medium') {
    return 'Medium';
  }

  if (priority === 'low') {
    return 'Low';
  }

  if (priority === 'lowest') {
    return 'Lowest';
  }

  return null;
}

/* =========================================================
    EXTRAI PRIORIDADE
    ========================================================= */

async function extractPriority(row: Locator): Promise<string> {
  for (const selector of SELECTORS.issueLinkPriorityCandidates) {
    const elements = row.locator(selector);

    const total = await elements.count();

    for (let i = 0; i < total; i++) {
      const element = elements.nth(i);

      const values = [
        await element.getAttribute('data-priority').catch(() => null),

        await element.getAttribute('alt').catch(() => null),

        await element.getAttribute('title').catch(() => null),

        await element.getAttribute('aria-label').catch(() => null),

        await element.innerText().catch(() => ''),
      ];

      for (const value of values) {
        if (!value) {
          continue;
        }

        const priority = parsePriority(value);

        if (priority) {
          return priority;
        }
      }
    }
  }

  return 'Unknown';
}

/* =========================================================
    ENCONTRA A LINHA DO ISSUE
    ========================================================= */

async function findIssueRow(keyElement: Locator): Promise<Locator> {
  /*
   * Primeiro tenta encontrar o container
   * mais próximo contendo:
   *
   * Summary
   * Status
   */

  let row = keyElement.locator(
    `xpath=ancestor::*[
            .//span[contains(@class,"link-summary")]
            and
            .//span[contains(@class,"jira-issue-status-lozenge")]
        ][1]`,
  );

  if ((await row.count()) > 0) {
    return row;
  }

  /*
   * Fallback para LI.
   */

  row = keyElement.locator('xpath=ancestor::li[1]');

  if ((await row.count()) > 0) {
    return row;
  }

  /*
   * Fallback para TR.
   */

  row = keyElement.locator('xpath=ancestor::tr[1]');

  if ((await row.count()) > 0) {
    return row;
  }

  /*
   * Último fallback.
   */

  return keyElement.locator('xpath=ancestor::dd[1]');
}

/* =========================================================
    ISSUE LINKS
    ========================================================= */

export async function extractIssueLinks(page: Page): Promise<IssueLink[]> {
  /*
   * Limita a busca ao módulo de Issue Links
   * quando ele existir.
   */

  let section: Locator;

  const linkingModule = page.locator('#linkingmodule');

  if ((await linkingModule.count()) > 0) {
    section = linkingModule;
  } else {
    section = page.locator('body');
  }

  const keys = section.locator(SELECTORS.issueLinkKey);

  const total = await keys.count();

  console.log(`Issue Links encontrados: ${total}`);

  const results: IssueLink[] = [];

  /* =====================================================
        PERCORRE CADA ISSUE
        ===================================================== */

  for (let i = 0; i < total; i++) {
    const keyElement = keys.nth(i);

    /* ===================================================
        PRIT
        =================================================== */

    const prit = (await keyElement.innerText()).trim();

    /* ===================================================
        LINHA
        =================================================== */

    const row = await findIssueRow(keyElement);

    /* ===================================================
        TÍTULO
        =================================================== */

    const titulo = (
      await row
        .locator(SELECTORS.issueLinkSummary)
        .first()
        .innerText()
        .catch(() => '')
    ).trim();

    /* ===================================================
        STATUS
        =================================================== */

    const status = (
      await row
        .locator(SELECTORS.issueLinkStatus)
        .first()
        .innerText()
        .catch(() => '')
    ).trim();

    /* ===================================================
        PRIORIDADE
        =================================================== */

    const priority = await extractPriority(row);

    /* ===================================================
        RELAÇÃO
        =================================================== */

    let relation = 'related';

    const relationDt = keyElement.locator('xpath=ancestor::dd[1]/preceding-sibling::dt[1]');

    if ((await relationDt.count()) > 0) {
      const relationText = (await relationDt.innerText().catch(() => '')).trim();

      if (relationText) {
        relation = relationText;
      }
    }

    /* ===================================================
        RESULTADO
        =================================================== */

    results.push({
      relation,

      prit,

      titulo,

      status,

      priority,
    });

    console.log(`${prit} | ${priority} | ${status}`);
  }

  return results;
}
