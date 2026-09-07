import 'dotenv/config';


export const JIRA_URL =
  process.env.JIRA_URL?.trim() ?? '';


export const JIRA_LOGIN_EMAIL =
  process.env.JIRA_LOGIN_EMAIL?.trim() ?? '';


if (!JIRA_URL) {
  throw new Error(
    'JIRA_URL não configurada no arquivo .env'
  );
}


if (!JIRA_LOGIN_EMAIL) {
  throw new Error(
    'JIRA_LOGIN_EMAIL não configurado no arquivo .env'
  );
}