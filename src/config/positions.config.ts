import type { PositionDefinition } from '../types/report.types';

export const DASHBOARD_PAGE_ID = '24419';

// Fonte de verdade da coleta e dos agrupamentos. A ordem das posições e dos
// arrays de execução é preservada nos relatórios. Test Plans são apenas links.
// Preencha o plano e os PRITs de execução diretamente em cada posição/tipo.
export const POSITIONS: PositionDefinition[] = [
  {
    name: 'COCO PT',
    testPlanPrit: 'IERL-23569',
    executions: {
      smoke: ['IERL-23515'],
      regression: ['IERL-23519', 'IERL-23518'],
      certification: [],
      defectFixing: [],
    },
  },
  {
    name: 'COCO SP',
    testPlanPrit: '',
    executions: { smoke: [], regression: [], certification: [], defectFixing: [] },
  },
  {
    name: 'OPT PT',
    testPlanPrit: '',
    executions: { smoke: [], regression: [], certification: [], defectFixing: [] },
  },
  {
    name: 'OPT SP',
    testPlanPrit: '',
    executions: { smoke: [], regression: [], certification: [], defectFixing: [] },
  },
  {
    name: 'Tangerina',
    testPlanPrit: '',
    executions: { smoke: [], regression: [], certification: [], defectFixing: [] },
  },
  {
    name: 'Olivais',
    testPlanPrit: '',
    executions: { smoke: [], regression: [], certification: [], defectFixing: [] },
  },
  {
    name: 'Badajoz',
    testPlanPrit: '',
    executions: { smoke: [], regression: [], certification: [], defectFixing: [] },
  },
  {
    name: 'Reseller',
    testPlanPrit: '',
    executions: { smoke: [], regression: [], certification: [], defectFixing: [] },
  },
  {
    name: 'Las Rosas',
    testPlanPrit: '',
    executions: { smoke: [], regression: [], certification: [], defectFixing: [] },
  },
  {
    name: 'Cyber SP',
    testPlanPrit: '',
    executions: { smoke: [], regression: [], certification: [], defectFixing: [] },
  },
  {
    name: 'Cyber PT',
    testPlanPrit: '',
    executions: { smoke: [], regression: [], certification: [], defectFixing: [] },
  },
  {
    name: 'Marinas',
    testPlanPrit: '',
    executions: { smoke: [], regression: [], certification: [], defectFixing: [] },
  },
  {
    name: 'Arco do Cego',
    testPlanPrit: '',
    executions: { smoke: [], regression: [], certification: [], defectFixing: [] },
  },
  {
    name: 'VMPOS - ALGRAGIDE',
    testPlanPrit: '',
    executions: { smoke: [], regression: [], certification: [], defectFixing: [] },
  },
  {
    name: 'VMPOS - OEIRAS',
    testPlanPrit: '',
    executions: { smoke: [], regression: [], certification: [], defectFixing: [] },
  },
];
