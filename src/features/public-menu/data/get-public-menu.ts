import { runtimeConfig } from '../../../config/runtime';
import { fetchPublicMenu } from '../api/public-menu-client';
import { getMenuFixture } from '../fixtures/public-menu-fixtures';
import type { PublicMenu } from '../contracts/public-menu';
import type { ValidMenuQuery } from '../lib/menu-query';

export function getPublicMenu(query: ValidMenuQuery): Promise<PublicMenu> {
  const slugQuery = {
    restaurantSlug: runtimeConfig.restaurantSlug,
    branchSlug: query.branchSlug,
  };

  if (runtimeConfig.useMenuFixture) {
    return getMenuFixture(runtimeConfig.menuFixtureScenario, slugQuery);
  }

  return fetchPublicMenu(runtimeConfig.apiBaseUrl, slugQuery);
}
