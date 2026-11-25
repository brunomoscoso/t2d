import type { Page } from 'playwright';
import { SELECTORS } from '../config/selectors';
import type { IssueLink } from '../types/report.types';

// Uma chamada ao browser para todos os links e campos, preservando innerText/CSS.
export async function extractIssueLinks(page: Page): Promise<IssueLink[]> {
  const results = await page.evaluate((selectors) => {
    const section = document.querySelector('#linkingmodule') ?? document.body;
    return Array.from(section.querySelectorAll(selectors.issueLinkKey), (key) => {
      let row = key.parentElement;
      while (
        row &&
        !(
          row.querySelector(selectors.issueLinkSummary) &&
          row.querySelector(selectors.issueLinkStatus)
        )
      )
        row = row.parentElement;
      row ??= key.closest('li') ?? key.closest('tr') ?? key.closest('dd');
      let priority = 'Unknown';
      outer: for (const selector of selectors.issueLinkPriorityCandidates) {
        for (const element of row?.querySelectorAll(selector) ?? []) {
          const values = ['data-priority', 'alt', 'title', 'aria-label'].map((attribute) =>
            element.getAttribute(attribute),
          );
          values.push((element as HTMLElement).innerText?.trim() ?? '');
          for (const value of values) {
            const match = value?.match(/\b(Highest|High|Medium|Lowest|Low)\b/i);
            if (match) {
              priority = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
              break outer;
            }
          }
        }
      }
      let relation = key.closest('dd')?.previousElementSibling ?? null;
      while (relation && relation.tagName !== 'DT') relation = relation.previousElementSibling;
      return {
        relation: (relation as HTMLElement | null)?.innerText?.trim() || 'related',
        prit: (key as HTMLElement).innerText.trim(),
        titulo: row?.querySelector<HTMLElement>(selectors.issueLinkSummary)?.innerText.trim() ?? '',
        status: row?.querySelector<HTMLElement>(selectors.issueLinkStatus)?.innerText.trim() ?? '',
        priority,
      };
    });
  }, SELECTORS);
  console.log(`Issue Links encontrados: ${results.length}`);
  return results;
}
