import { Page } from 'playwright';

import { SELECTORS } from '../config/selectors';

/* =========================================================
    LIMPA STATUS
    ========================================================= */

function cleanStatus(status: string): string {
  return status.replace(/\s+/g, ' ').trim().toUpperCase();
}

/* =========================================================
    EXTRAI STATUS PRINCIPAL
    ========================================================= */

export async function extractMainStatus(page: Page): Promise<string> {
  console.log('Procurando status principal do PRIT...');

  for (const selector of SELECTORS.mainStatusCandidates) {
    const elements = page.locator(selector);

    const total = await elements.count();

    if (total === 0) {
      continue;
    }

    for (let i = 0; i < total; i++) {
      const element = elements.nth(i);

      const visible = await element.isVisible().catch(() => false);

      if (!visible) {
        continue;
      }

      const text = (await element.innerText().catch(() => '')).trim();

      if (!text) {
        continue;
      }

      const status = cleanStatus(text);

      /*
       * Evita selecionar dropdowns
       * que não sejam status.
       */

      const knownStatuses = [
        'DONE',

        'IN PROGRESS',

        'TO DO',

        'OPEN',

        'CLOSED',

        'RESOLVED',

        'BLOCKED',

        'EXECUTING',

        'ABORTED',

        'FOR TESTING',

        'FOR_TESTING',

        'PENDING 3RD',

        'PENDING_3RD',
      ];

      if (knownStatuses.includes(status)) {
        console.log(`Status principal: ${status}`);

        return status;
      }
    }
  }

  console.log('⚠️ Status principal não encontrado.');

  return 'UNKNOWN';
}
