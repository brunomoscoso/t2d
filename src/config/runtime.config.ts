import 'dotenv/config';
import { POSITIONS as defaults, DASHBOARD_PAGE_ID as defaultDashboard } from './positions.config';
import { parseRunConfig } from './run-config';

// A configuração recebida do workflow substitui integralmente a configuração local.
const config =
  process.env.T2D_CONFIG_JSON === undefined
    ? { positions: defaults, dashboardPageId: defaultDashboard }
    : parseRunConfig(process.env.T2D_CONFIG_JSON);

export const POSITIONS = config.positions;
export const DASHBOARD_PAGE_ID = config.dashboardPageId;
