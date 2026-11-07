import { POSITIONS, DASHBOARD_PAGE_ID } from '../src/config/runtime.config';
import { getConfiguredExecutions } from '../src/utils/position.utils';

if (!process.env.T2D_CONFIG_JSON) throw new Error('T2D_CONFIG_JSON é obrigatório no workflow.');
const executions = getConfiguredExecutions(POSITIONS);
if (!executions.length) throw new Error('Configure pelo menos uma execução ou plano por país.');
console.log(
  `Configuração válida: ${POSITIONS.length} posições e ${executions.length} fontes; dashboard ${DASHBOARD_PAGE_ID}.`,
);
