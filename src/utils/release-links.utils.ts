import { DASHBOARD_PAGE_ID, POSITIONS } from '../config/positions.config';
import type { PositionDefinition, ReleaseLinks } from '../types/report.types';
import { resolvePositions } from './position.utils';

export function getConfiguredReleaseLinks(
  configured: PositionDefinition[] = POSITIONS,
): ReleaseLinks {
  return {
    testPlans: resolvePositions(configured).map((position) => ({
      position: position.name,
      prit: position.testPlanPrit,
    })),
    dashboardPageId: DASHBOARD_PAGE_ID,
  };
}
