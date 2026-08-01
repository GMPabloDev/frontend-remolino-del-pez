import { runtimeConfig } from '../../../config/runtime';
import {
  fetchPublicMenu,
  type PublicMenuSlugQuery,
} from '../api/public-menu-client';
import { getMenuFixture } from '../fixtures/public-menu-fixtures';
import type { PublicMenu } from '../contracts/public-menu';
import type { ValidMenuQuery } from '../lib/menu-query';

export function getPublicMenu(query: ValidMenuQuery | PublicMenuSlugQuery): Promise<PublicMenu> {
  const slugQuery: PublicMenuSlugQuery =
    'restaurantSlug' in query
      ? query
      : { restaurantSlug: query.restaurantId, branchSlug: query.branchId };

  if (runtimeConfig.useMenuFixture) {
    return getMenuFixture(runtimeConfig.menuFixtureScenario, slugQuery);
  }

  return fetchPublicMenu(runtimeConfig.apiBaseUrl, slugQuery);
}
