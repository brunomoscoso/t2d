import type { Page } from 'playwright';
import { SELECTORS } from '../config/selectors';

/** Lê o campo do Test Plan aberto, sem confundir com Labels ou Affects Version/s. */
export async function extractFixVersions(page: Page): Promise<string[]> {
  const label = page.locator(SELECTORS.fixVersions.label);
  await label.waitFor({ state: 'visible', timeout: 15000 });
  if ((await label.innerText()).replace(/\s+/g, ' ').trim() !== 'Fix Version/s:') {
    throw new Error('O campo encontrado não corresponde a Fix Version/s.');
  }
  await page.locator(SELECTORS.fixVersions.value).waitFor({ state: 'visible', timeout: 15000 });
  return [
    ...new Set(
      (await page.locator(SELECTORS.fixVersions.links).allTextContents())
        .map((value) => value.replace(/\s+/g, ' ').trim())
        .filter(Boolean),
    ),
  ];
}
