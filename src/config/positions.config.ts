import type { PositionDefinition } from '../types/report.types';
export const DASHBOARD_PAGE_ID = '24360';

export const POSITIONS: PositionDefinition[] = [
  {
    name: 'COCO PT',
    testPlanPrit: 'PRIT-8419',
    executions: {
      smoke: ['PRIT-8422'],
      regression: ['PRIT-8420','PRIT-8421'],
      certification: ['PRIT-8549','PRIT-8547','PRIT-8545'],
      defectFixing: ['PRIT-8423'],
    },
  },
  {
    name: 'COCO SP',
    testPlanPrit: 'PRIT-8424',
    executions: {
      smoke: ['PRIT-8426'],
      regression: ['PRIT-8425'],
      certification: [],
      defectFixing: ['PRIT-8427'],
    },
  },
  {
    name: 'OPT PT',
    testPlanPrit: '',
    executions: {
      smoke: [],
      regression: [],
      certification: [],
      defectFixing: [],
    },
  },
  {
    name: 'OPT SP',
    testPlanPrit: '',
    executions: {
      smoke: [],
      regression: [],
      certification: [],
      defectFixing: [],
    },
  },
  {
    name: 'Tangerina',
    testPlanPrit: 'PRIT-8428',
    executions: {
      smoke: ['PRIT-8431'],
      regression: ['PRIT-8429', 'PRIT-8430'],
      certification: [],
      defectFixing: ['PRIT-8432'],
    },
  },
  {
    name: 'Olivais',
    testPlanPrit: '',
    executions: {
      smoke: [],
      regression: [],
      certification: [],
      defectFixing: [],
    },
  },
  {
    name: 'Badajoz',
    testPlanPrit: '',
    executions: {
      smoke: [],
      regression: [],
      certification: [],
      defectFixing: [],
    },
  },
  {
    name: 'Reseller',
    testPlanPrit: 'PRIT-8437',
    executions: {
      smoke: ['PRIT-8439'],
      regression: ['PRIT-8438'],
      certification: [],
      defectFixing: ['PRIT-8440'],
    },
  },
  {
    name: 'Las Rosas',
    testPlanPrit: '',
    executions: {
      smoke: [],
      regression: [],
      certification: [],
      defectFixing: [],
    },
  },
  {
    name: 'Cyber SP',
    testPlanPrit: '',
    executions: {
      smoke: [],
      regression: [],
      certification: [],
      defectFixing: [],
    },
  },
  {
    name: 'Cyber PT',
    testPlanPrit: '',
    executions: {
      smoke: [],
      regression: [],
      certification: [],
      defectFixing: [],
    },
  },
  {
    name: 'Marinas',
    testPlanPrit: 'PRIT-8433',
    executions: {
      smoke: ['PRIT-8435'],
      regression: ['PRIT-8434'],
      certification: [],
      defectFixing: ['PRIT-8436'],
    },
  },
  {
    name: 'Arco do Cego',
    testPlanPrit: '',
    executions: {
      smoke: [],
      regression: [],
      certification: [],
      defectFixing: [],
    },
  },
  {
    name: 'VMPOS - ALGRAGIDE',
    testPlanPrit: '',
    executions: {
      smoke: [],
      regression: [],
      certification: [],
      defectFixing: [],
    },
  },
  {
    name: 'VMPOS - OEIRAS',
    testPlanPrit: '',
    executions: {
      smoke: [],
      regression: [],
      certification: [],
      defectFixing: [],
    },
  },
  {
    name: 'Automação',
    testPlans: {
      portugal: 'PRIT-5525',
      espanha: 'PRIT-5573',
    },
  },
];
