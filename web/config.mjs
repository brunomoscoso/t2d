export const TYPES = ['smoke', 'regression', 'certification', 'defectFixing'];
export const LABELS = {
  smoke: 'Smoke',
  regression: 'Regressão',
  certification: 'Certificação',
  defectFixing: 'Defect Fixing',
};
export const STORAGE_KEY = 't2d.workspace.v1';

export function newPosition(name = 'Nova posição') {
  return {
    name,
    testPlanPrit: '',
    executions: Object.fromEntries(TYPES.map((type) => [type, []])),
  };
}

export function normalizePrit(value) {
  if (typeof value !== 'string') throw new Error('A PRIT deve ser texto.');
  const text = value.trim().toUpperCase();
  const prit = /^\d+$/.test(text) ? `PRIT-${text}` : text;
  if (!/^[A-Z][A-Z0-9_]*-\d+$/.test(prit))
    throw new Error(`PRIT inválida: ${value}. Use PRIT-1234 ou 1234.`);
  return prit;
}

export function actionsUrl(repository) {
  const name = repository.trim();
  if (!/^[a-zA-Z0-9-]+\/[a-zA-Z0-9_.-]+$/.test(name))
    throw new Error('Indique o repositório no formato utilizador/repositório.');
  return `https://github.com/${name}/actions/workflows/t2d.yml`;
}

export function countSources(positions) {
  return positions.reduce(
    (count, position) =>
      count +
      (position.testPlans
        ? Object.values(position.testPlans).filter((value) => value.trim()).length
        : TYPES.reduce((sum, type) => sum + position.executions[type].length, 0)),
    0,
  );
}

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

export function validateConfig(value, requireSources = true) {
  if (
    !object(value) ||
    typeof value.dashboardPageId !== 'string' ||
    !/^\d+$/.test(value.dashboardPageId)
  ) {
    throw new Error('Preencha o ID numérico do dashboard Jira.');
  }
  if (!Array.isArray(value.positions) || !value.positions.length || value.positions.length > 100)
    throw new Error('Configure entre 1 e 100 posições.');
  const names = new Set();
  const owners = new Map();
  const optionalPrit = (text) => (text === undefined || text === '' ? '' : normalizePrit(text));
  const positions = value.positions.map((position) => {
    if (
      !object(position) ||
      typeof position.name !== 'string' ||
      !position.name.trim() ||
      position.name.length > 100
    )
      throw new Error('Todas as posições precisam de um nome (até 100 caracteres).');
    const name = position.name.trim();
    if (names.has(name.toUpperCase())) throw new Error(`Posição repetida: ${name}.`);
    names.add(name.toUpperCase());
    if (position.testPlans !== undefined) {
      if (
        !object(position.testPlans) ||
        typeof position.testPlans.portugal !== 'string' ||
        typeof position.testPlans.espanha !== 'string'
      )
        throw new Error(`${name}: planos por país inválidos.`);
      if (
        position.testPlanPrit ||
        (position.executions &&
          Object.values(position.executions).some((list) => !Array.isArray(list) || list.length))
      )
        throw new Error(`${name}: configure apenas planos por país, sem execuções.`);
      return {
        name,
        testPlans: {
          portugal: optionalPrit(position.testPlans.portugal.trim()),
          espanha: optionalPrit(position.testPlans.espanha.trim()),
        },
      };
    }
    if (
      !object(position.executions) ||
      Object.keys(position.executions).some((type) => !TYPES.includes(type))
    )
      throw new Error(`${name}: tipos de execução inválidos.`);
    const executions = Object.fromEntries(
      TYPES.map((type) => {
        if (!Array.isArray(position.executions[type]) || position.executions[type].length > 500)
          throw new Error(`${name}/${type}: lista de PRITs inválida.`);
        return [
          type,
          position.executions[type].map((value) => {
            const prit = normalizePrit(value);
            if (owners.has(prit))
              throw new Error(`${prit} repetida em ${owners.get(prit)} e ${name}/${LABELS[type]}.`);
            owners.set(prit, `${name}/${LABELS[type]}`);
            return prit;
          }),
        ];
      }),
    );
    return {
      name,
      testPlanPrit: optionalPrit(
        typeof position.testPlanPrit === 'string'
          ? position.testPlanPrit.trim()
          : position.testPlanPrit,
      ),
      executions,
    };
  });
  for (const position of positions) {
    for (const prit of position.testPlans
      ? Object.values(position.testPlans)
      : [position.testPlanPrit]) {
      if (prit && owners.has(prit))
        throw new Error(`${prit}: Test Plan de ${position.name} também usado como execução.`);
    }
  }
  const sources = new Set(owners.keys());
  for (const position of positions)
    for (const prit of Object.values(position.testPlans ?? {})) {
      if (!prit) continue;
      if (sources.has(prit)) throw new Error(`${prit}: fonte de recolha repetida.`);
      sources.add(prit);
    }
  if (requireSources && !sources.size)
    throw new Error('Adicione pelo menos uma PRIT de execução ou plano por país.');
  const config = {
    dashboardPageId: value.dashboardPageId,
    positions: positions.sort((a, b) => Number(!!a.testPlans) - Number(!!b.testPlans)),
  };
  if (new TextEncoder().encode(JSON.stringify(config)).length > 60000)
    throw new Error('A configuração excede o limite de 60 KB.');
  return config;
}
