import 'dotenv/config';

export const JIRA_URL =
  process.env.JIRA_URL ?? '';

export const PRITS = [
  'PRIT-XXX',
  'PRIT-XXX'
];

if (!JIRA_URL) {
  throw new Error(
    'JIRA_URL não configurada no arquivo .env'
  );
}