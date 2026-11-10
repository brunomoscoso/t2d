import { Browser, Page, chromium } from 'playwright';

import { JIRA_URL, JIRA_LOGIN_EMAIL } from '../config/jira.config';
import { SELECTORS } from '../config/selectors';

type BrowserSession = {
  browser: Browser;
  page: Page;
};

/* =========================================================
    LOGIN MICROSOFT
    ========================================================= */

async function fillMicrosoftEmail(page: Page): Promise<void> {
  console.log('\nProcurando tela de login...');

  /*
   * O campo padrão da Microsoft normalmente é:
   *
   * name="loginfmt"
   *
   * Mantemos também alguns fallbacks.
   */

  const emailInput = page
    .locator(
      ['input[name="loginfmt"]', 'input[type="email"]', 'input[autocomplete="username"]'].join(','),
    )
    .first();

  const emailVisible = await emailInput
    .waitFor({
      state: 'visible',
      timeout: 30000,
    })
    .then(() => true)
    .catch(() => false);

  if (!emailVisible) {
    console.log('ℹ️ Campo de e-mail não encontrado.');

    console.log('O Jira pode já estar autenticado ou a página de login pode ser diferente.');

    return;
  }

  /*
   * Preenche o e-mail.
   */

  await emailInput.fill(JIRA_LOGIN_EMAIL);

  console.log(`✅ E-mail preenchido: ${JIRA_LOGIN_EMAIL}`);

  /*
   * Botão padrão da Microsoft:
   *
   * id="idSIButton9"
   *
   * Geralmente representa:
   *
   * Next
   * Avançar
   * Entrar
   */

  const submitButton = page
    .locator(['#idSIButton9', 'input[type="submit"]', 'button[type="submit"]'].join(','))
    .first();

  const buttonVisible = await submitButton.isVisible().catch(() => false);

  if (!buttonVisible) {
    console.log('⚠️ Botão para continuar não encontrado.');

    return;
  }

  await submitButton.click();

  console.log('✅ Login iniciado.');
}

/* =========================================================
    CRIA SESSÃO
    ========================================================= */

export async function createBrowserSession(firstPrit: string): Promise<BrowserSession> {
  const browser = await chromium.launch({
    channel: 'msedge',

    headless: false,
  });

  const context = await browser.newContext();

  let contextClosed = false;
  context.once('close', () => {
    contextClosed = true;
  });

  const page = await context.newPage();

  console.log('\nAbrindo Jira...');

  await page.goto(`${JIRA_URL}/browse/${firstPrit}`, {
    waitUntil: 'domcontentloaded',
  });

  /*
   * Espera possíveis redirects:
   *
   * Jira
   * ↓
   * Microsoft Login
   */

  await page.waitForTimeout(2000);

  /*
   * Preenche automaticamente
   * e-mail e inicia o login.
   */

  await fillMicrosoftEmail(page);

  console.log('\n');

  console.log('Conclua agora a autenticação corporativa / MFA / Authenticator.');

  console.log('Aguardando o Jira carregar para iniciar a recolha automaticamente...');

  try {
    const issueUrl = new URL(`${JIRA_URL}/browse/${firstPrit}`);
    await page.waitForURL(
      (url) => url.origin === issueUrl.origin && url.pathname === issueUrl.pathname,
      { waitUntil: 'domcontentloaded', timeout: 10 * 60 * 1000 },
    );
    await page.locator(SELECTORS.title).waitFor({ state: 'visible', timeout: 90000 });
  } catch (error) {
    await browser.close();
    throw new Error(
      'Não foi possível confirmar o carregamento do Jira após o login. Conclua a autenticação e verifique o acesso à issue configurada.',
      { cause: error },
    );
  }

  console.log('✅ Jira carregado. A iniciar a recolha automaticamente.');

  if (!browser.isConnected() || contextClosed) {
    throw new Error(
      'O navegador ou o contexto autenticado foi fechado. Não é possível iniciar a extração.',
    );
  }

  let extractionPage: Page;
  try {
    extractionPage = await context.newPage();
  } catch (error) {
    throw new Error(
      'Não foi possível abrir a página de extração no contexto autenticado. Verifique se o navegador e o contexto continuam abertos.',
      { cause: error },
    );
  }

  return {
    browser,
    page: extractionPage,
  };
}
