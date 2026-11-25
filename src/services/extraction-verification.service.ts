import type { APIRequestContext } from 'playwright';
import { setTimeout as delay } from 'node:timers/promises';
import { isDeepStrictEqual } from 'node:util';
import type { ExecutionData } from '../types/report.types';
import { normalizePrit } from '../utils/prit.utils';

function object(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Resposta de validação inválida.');
  return value as Record<string, any>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error('Campo obrigatório ausente na referência do servidor.');
  return value.trim();
}
async function json(request: APIRequestContext, url: string): Promise<unknown> {
  const response = await request.get(url, {
    timeout: 30000,
    headers: { Accept: 'application/json' },
  });
  try {
    if (!response.ok())
      throw new Error(`Validação do carregamento indisponível: HTTP ${response.status()}.`);
    return await response.json();
  } finally {
    await response.dispose();
  }
}

export async function readExpectedPlanKeys(
  request: APIRequestContext,
  baseUrl: string,
  key: string,
): Promise<string[]> {
  const result = await json(
    request,
    `${baseUrl.replace(/\/+$/, '')}/rest/raven/1.0/api/testplan/${normalizePrit(key)}/testexecution`,
  );
  if (!Array.isArray(result))
    throw new Error('Não foi possível confirmar a lista de execuções do Test Plan.');
  return [...new Set(result.map((item) => text(object(item).key)))].sort();
}

// Percorre até uma página vazia: não presume que o servidor respeita o limite pedido.
export async function readXrayPages(
  request: APIRequestContext,
  url: string,
): Promise<Record<string, any>[]> {
  const items: Record<string, any>[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= 1000; page++) {
    const result = await json(request, `${url}?limit=100&page=${page}`);
    if (!Array.isArray(result))
      throw new Error('Lista Xray inválida; não é possível confirmar todos os dados.');
    if (!result.length) return items;
    for (const item of result) {
      const row = object(item);
      const key = text(row.key);
      if (seen.has(key)) throw new Error('Paginação Xray repetida ou alterada durante a consulta.');
      seen.add(key);
      items.push(row);
    }
  }
  throw new Error('Limite de paginação Xray excedido; recolha incompleta.');
}

export async function readExpectedExecution(
  request: APIRequestContext,
  baseUrl: string,
  key: string,
): Promise<ExecutionData> {
  const prit = normalizePrit(key);
  const base = baseUrl.replace(/\/+$/, '');
  const issue = object(
    await json(
      request,
      `${base}/rest/api/2/issue/${prit}?fields=summary,status,fixVersions,issuelinks,issuetype`,
    ),
  );
  if (issue.key !== prit) throw new Error('O servidor devolveu uma issue diferente da pedida.');
  const fields = object(issue.fields);
  const type = text(object(fields.issuetype).name);
  const resource =
    type === 'Test Execution' ? 'testexec' : type === 'Test Plan' ? 'testplan' : undefined;
  if (!resource) throw new Error(`Tipo de issue sem validação de completude: ${type}.`);
  if (!Array.isArray(fields.fixVersions) || !Array.isArray(fields.issuelinks))
    throw new Error('Versões ou links ausentes na referência do Jira.');
  const tests = await readXrayPages(request, `${base}/rest/raven/1.0/api/${resource}/${prit}/test`);
  const counts = new Map<string, number>();
  for (const test of tests) {
    const status = text(resource === 'testplan' ? test.latestStatus : test.status).toUpperCase();
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return {
    prit,
    title: text(fields.summary),
    mainStatus: text(object(fields.status).name),
    fixVersions: fields.fixVersions.map((version: unknown) => text(object(version).name)),
    totalTests: tests.length,
    executionStatuses: [...counts].map(([status, quantidade]) => ({ status, quantidade })),
    issueLinks: fields.issuelinks.map((value: unknown) => {
      const link = object(value);
      const inward = Boolean(link.inwardIssue);
      const related = object(inward ? link.inwardIssue : link.outwardIssue);
      const details = object(related.fields);
      if (!('priority' in details)) throw new Error('Prioridade do link ausente na referência.');
      return {
        prit: text(related.key),
        relation: text(object(link.type)[inward ? 'inward' : 'outward']),
        titulo: text(details.summary),
        status: text(object(details.status).name),
        priority: details.priority === null ? 'Unknown' : text(object(details.priority).name),
      };
    }),
  };
}

export function dataDifferences(expected: ExecutionData, actual: ExecutionData): string[] {
  const clean = (value: string) => value.replace(/\s+/g, ' ').trim();
  const canonical = (data: ExecutionData) => ({
    prit: data.prit,
    title: clean(data.title),
    mainStatus: clean(data.mainStatus).toUpperCase(),
    fixVersions: [...new Set((data.fixVersions ?? []).map(clean))].sort(),
    totalTests: data.totalTests,
    executionStatuses: data.executionStatuses
      .filter((item) => item.quantidade !== 0)
      .map((item) => [clean(item.status).toUpperCase(), item.quantidade])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    issueLinks: data.issueLinks
      .map((link) =>
        JSON.stringify([
          link.prit,
          clean(link.relation),
          clean(link.titulo),
          clean(link.status).toUpperCase(),
          clean(link.priority).toUpperCase(),
        ]),
      )
      .sort(),
  });
  const left = canonical(expected);
  const right = canonical(actual);
  return (Object.keys(left) as (keyof typeof left)[]).filter(
    (key) => !isDeepStrictEqual(left[key], right[key]),
  );
}

export async function waitForVerifiedData(
  expected: ExecutionData,
  read: () => Promise<ExecutionData>,
  timeout = 60000,
): Promise<ExecutionData> {
  const deadline = performance.now() + timeout;
  let reason = 'dados indisponíveis';
  let last: ExecutionData | undefined;
  let fields: string[] = [];
  do {
    const actual = await read();
    last = actual;
    const differences = dataDifferences(expected, actual);
    fields = [
      ...new Set([
        ...differences,
        ...(actual.extractionWarnings ?? []).map((warning) => warning.field),
      ]),
    ];
    if (!fields.length) return actual;
    reason = fields.join(', ');
    if (performance.now() >= deadline) break;
    await delay(Math.min(200, Math.max(0, deadline - performance.now())));
  } while (performance.now() < deadline);
  throw new UnverifiedExtractionError(
    `${expected.prit}: carregamento não confirmado (${reason}).`,
    last!,
    fields,
  );
}

export class UnverifiedExtractionError extends Error {
  constructor(
    message: string,
    public data: ExecutionData,
    public fields: string[],
  ) {
    super(message);
  }
}
