import { DASHBOARD_PAGE_IDS, POSITIONS } from '../config/positions.config';
import type { PositionDefinition, ReleaseLinks, TestPlanLink } from '../types/report.types';
import { resolvePositions } from './position.utils';

export function getConfiguredReleaseLinks(
  configured: PositionDefinition[] = POSITIONS,
): ReleaseLinks {
  return {
    testPlans: resolvePositions(configured).flatMap((position): TestPlanLink[] =>
      position.testPlans
        ? [
            {
              position: position.name,
              label: `${position.name} — Portugal`,
              prit: position.testPlans.portugal,
            },
            {
              position: position.name,
              label: `${position.name} — Espanha`,
              prit: position.testPlans.espanha,
            },
          ]
        : [{ position: position.name, prit: position.testPlanPrit }],
    ),
    dashboards: [...new Set(DASHBOARD_PAGE_IDS.map((id) => id.trim()).filter(Boolean))].map(
      (pageId) => ({ pageId }),
    ),
  };
}
