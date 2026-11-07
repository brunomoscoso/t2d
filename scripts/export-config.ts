import { mkdirSync, writeFileSync } from 'node:fs';
import { POSITIONS, DASHBOARD_PAGE_ID } from '../src/config/positions.config';

mkdirSync('output', { recursive: true });
writeFileSync(
  'output/positions.json',
  JSON.stringify({ dashboardPageId: DASHBOARD_PAGE_ID, positions: POSITIONS }, null, 2),
);
console.log(
  'Configuração exportada para output/positions.json. Importe este ficheiro na interface.',
);
