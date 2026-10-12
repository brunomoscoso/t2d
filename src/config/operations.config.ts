// Issues de execução que serão coletadas nesta release.
export const PRITS = [
  'PRIT-8329',
  'PRIT-8328'
];

export const DASHBOARD_PAGE_ID = '24419';

// Test Plans da release. As execuções vinculadas precisam constar também em PRITS.
export const TEST_PLANS = {
  smokes: { prit: '8161' },
  certification: { prit: '8157' },
  regression: { prit: '8165' },
  defectFixing: { prit: '8171' },
};
