import { Browser, Page, chromium } from 'playwright';
import { JIRA_URL, JIRA_LOGIN_EMAIL } from '../config/jira.config';
import { waitForJiraAuthentication } from './jira-auth.service';
import { reportProgress } from './progress.service';

type BrowserSession = { browser: Browser; page: Page };

async function fillMicrosoftEmail(page: Page): Promise<void> {
  const emailInput = page
    .locator('input[name="loginfmt"], input[type="email"], input[autocomplete="username"]')
    .first();
  const visible = await emailInput
    .waitFor({ state: 'visible', timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  if (!visible) return;
  await emailInput.fill(JIRA_LOGIN_EMAIL);
  const submit = page.locator('#idSIButton9, input[type="submit"], button[type="submit"]').first();
  if (await submit.isVisible()) await submit.click();
}

export async function createBrowserSession(firstPrit: string): Promise<BrowserSession> {
  const cloud = process.env.GITHUB_ACTIONS === 'true' || process.env.CI === 'true';
  const headless = process.env.T2D_HEADLESS ? process.env.T2D_HEADLESS === 'true' : cloud;
  const timeoutMs = Number(process.env.T2D_AUTH_TIMEOUT_MS ?? 300000);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 900000) {
    throw new Error('T2D_AUTH_TIMEOUT_MS deve estar entre 1000 e 900000.');
  }
  const browser = await chromium.launch({
    channel: process.env.T2D_BROWSER_CHANNEL || (cloud ? undefined : 'msedge'),
    headless,
  });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    reportProgress(
      'authentication',
      'A abrir o Jira. Confirme a autenticação corporativa no telemóvel.',
    );
    await page.goto(`${JIRA_URL}/browse/${encodeURIComponent(firstPrit)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await fillMicrosoftEmail(page);
    await waitForJiraAuthentication(page, {
      jiraUrl: JIRA_URL,
      timeoutMs,
      headless,
      onMfaNumber: (number) =>
        console.log(
          `MFA desta execução: confirme o número ${number} no Authenticator apenas se iniciou este acesso.`,
        ),
    });
    reportProgress('authentication', 'Jira autenticado e elementos da issue disponíveis.');
    return { browser, page };
  } catch (error) {
    await browser.close();
    throw error;
  }
}
