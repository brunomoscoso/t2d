import 'dotenv/config';

export const JIRA_URL =
  process.env.JIRA_URL ?? '';

if (!JIRA_URL) {
  throw new Error(
    'JIRA_URL não configurada no arquivo .env'
  );
}