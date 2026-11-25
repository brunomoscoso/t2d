import type { BrowserContext, Page } from 'playwright';

/** Uma página por worker; mantém a ordem e permite sinalizar itens indisponíveis. */
export async function collectWithPages<T, R>(
  context: BrowserContext,
  items: readonly T[],
  collect: (page: Page, item: T) => Promise<R>,
  concurrency = 2,
  onFailure?: (item: T, error: unknown) => R,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 2) {
    throw new Error('A concorrência deve ser 1 ou 2.');
  }
  const results = new Array<R>(items.length);
  let next = 0;
  let failed = false;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    let page: Page | undefined;
    try {
      page = await context.newPage();
      while (!failed && next < items.length) {
        const index = next++;
        results[index] = await collect(page, items[index]);
      }
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      await page?.close();
    }
  });
  const settled = await Promise.allSettled(workers);
  const failure = settled.find((result) => result.status === 'rejected');
  if (failure?.status === 'rejected') {
    if (!onFailure) throw failure.reason;
    return items.map((item, index) =>
      index in results ? results[index] : onFailure(item, failure.reason),
    );
  }
  return results;
}
