import type { Page } from 'playwright';
import { SELECTORS } from '../config/selectors';

type AuthOptions = {
  jiraUrl: string;
  timeoutMs: number;
  headless: boolean;
  onMfaNumber?: (number: string) => void;
};

// Só liberta a extração na origem do Jira e com os elementos reais da issue visíveis.
export async function waitForJiraAuthentication(page: Page, options: AuthOptions): Promise<void> {
  const expectedOrigin = new URL(options.jiraUrl).origin;
  const deadline = Date.now() + options.timeoutMs;
  let lastNumber = '';
  while (Date.now() < deadline) {
    if (page.isClosed()) throw new Error('O navegador foi fechado durante a autenticação.');
    const inJira = new URL(page.url()).origin === expectedOrigin;
    if (
      inJira &&
      (await page.locator(SELECTORS.title).isVisible()) &&
      (await page.locator('#status-val').isVisible())
    )
      return;

    if (options.headless && (await page.locator('input[type="password"]').first().isVisible())) {
      throw new Error(
        'O provedor pediu palavra-passe no runner. O fluxo apenas com e-mail e MFA não é compatível com esta política. Valide com a equipa de identidade ou utilize um runner corporativo aprovado.',
      );
    }
    // Seletores específicos do Microsoft Authenticator; nunca captura a página nem códigos OTP.
    const numberElement = page
      .locator('#idRichContext_DisplaySign, #idRemoteNGC_DisplaySign')
      .first();
    if (await numberElement.isVisible()) {
      const number = (await numberElement.innerText()).trim();
      if (/^\d{2,3}$/.test(number) && number !== lastNumber) {
        lastNumber = number;
        options.onMfaNumber?.(number);
      }
    }
    await page.waitForTimeout(Math.min(1000, Math.max(1, deadline - Date.now())));
  }
  throw new Error(
    'Tempo de autenticação esgotado. O Jira não disponibilizou o título e o estado da issue. Verifique MFA, acesso à rede e políticas de acesso condicional do runner.',
  );
}
