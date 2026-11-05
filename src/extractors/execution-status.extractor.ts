import { errors, Page } from 'playwright';

import { SELECTORS } from '../config/selectors';

import { ExecutionStatus } from '../types/report.types';

// A ausência da secção não impede a coleta dos demais dados da execução.
export async function extractExecutionStatuses(page: Page): Promise<ExecutionStatus[]> {
  console.log('Procurando Overall Execution Status...');

  const overallStatus = page
    .getByText('Overall Execution Status', {
      exact: true,
    })
    .first();

  try {
    await overallStatus.waitFor({
      state: 'visible',
      timeout: 40000,
    });
  } catch (error) {
    if (error instanceof errors.TimeoutError) {
      console.log(
        '⚠️ Nenhum status de testes encontrado: Overall Execution Status não ficou visível após 40 segundos. Continuando a coleta dos demais dados.',
      );
      return [];
    }
    throw new Error('Overall Execution Status não encontrado após 40 segundos.', { cause: error });
  }

  await overallStatus.scrollIntoViewIfNeeded();

  await page.waitForTimeout(3000);

  // Primeiro tenta ler os elementos estruturados do Xray.
  const countsLocator = page.locator(SELECTORS.executionStatusCount);

  const namesLocator = page.locator(SELECTORS.executionStatusName);

  const totalCounts = await countsLocator.count();

  const totalNames = await namesLocator.count();

  if (totalCounts > 0 && totalNames > 0) {
    const counts = await countsLocator.allTextContents();

    const names = await namesLocator.allTextContents();

    const statuses: ExecutionStatus[] = [];

    if (counts.length !== names.length) {
      throw new Error(
        `Overall Execution Status incompleto: foram encontrados ${names.length} status e ${counts.length} quantidades.`,
      );
    }

    for (let i = 0; i < counts.length; i++) {
      const quantidade = Number(counts[i].trim());

      const status = names[i].trim();

      if (!status || !Number.isSafeInteger(quantidade) || quantidade < 0) {
        throw new Error(`Overall Execution Status contém dados inválidos na linha ${i + 1}.`);
      }

      statuses.push({
        status,
        quantidade,
      });
    }

    if (statuses.length === 0) {
      throw new Error('Overall Execution Status foi encontrado, mas não contém resultados.');
    }
    return statuses;
  }

  // Algumas versões do Jira não expõem os seletores do Xray; nesse caso, analisa o texto próximo.
  console.log('ℹ️ Utilizando fallback de texto.');

  const summaryText = await overallStatus.evaluate((element) => {
    let parent = element.parentElement;
    while (parent) {
      // innerText pode concatenar spans adjacentes: 112PASS38FAIL9TODO.
      // Separa os nós de texto visíveis sem alterar nomes como PENDING_3RD.
      const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);
      const parts: string[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const owner = node.parentElement;
        if (!owner || !owner.getClientRects().length) continue;
        const style = getComputedStyle(owner);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        const text = node.textContent?.trim();
        if (text) parts.push(text);
      }
      const text = parts.join(' ');
      const start = text.indexOf('Overall Execution Status');
      const summary = start >= 0 ? text.slice(start) : '';
      if (/Total Tests:\s*\d+/i.test(summary)) return summary;
      parent = parent.parentElement;
    }
    return '';
  });

  if (!summaryText) {
    throw new Error(
      'Overall Execution Status não contém dados nem o total de testes para validar o fallback.',
    );
  }

  const statusPart = summaryText
    .replace(/Overall Execution Status/i, '')
    .split(/Total Tests:/i)[0]
    .replace(/\s+/g, ' ')
    .trim();

  const statuses: ExecutionStatus[] = [];

  const regex = /(\d+)\s+([A-Za-z][A-Za-z0-9 _-]*?)(?=\s+\d+\s+[A-Za-z]|\s*$)/g;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(statusPart)) !== null) {
    statuses.push({
      quantidade: Number(match[1]),

      status: match[2].trim().toUpperCase(),
    });
  }

  if (statuses.length === 0) {
    throw new Error('Não foi possível extrair nenhum status de Overall Execution Status.');
  }

  return statuses;
}
