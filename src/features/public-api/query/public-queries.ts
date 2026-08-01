import { useQuery } from '@tanstack/react-query';

import { runtimeConfig } from '../../../config/runtime';
import {
  fetchPublicBranches,
  fetchPublicRestaurant,
} from '../../public-discovery/api/public-discovery-client';
import {
  getBranchesFixture,
  getRestaurantFixture,
} from '../../public-discovery/fixtures/public-discovery-fixtures';
import { getPublicMenu } from '../../public-menu/data/get-public-menu';
import type { PublicMenu } from '../../public-menu/contracts/public-menu';
import { publicQueryKeys } from './public-query-keys';

export function usePublicRestaurantQuery() {
  return useQuery({
    queryKey: publicQueryKeys.restaurant(runtimeConfig.restaurantSlug),
    queryFn: () =>
      runtimeConfig.useMenuFixture
        ? Promise.resolve(getRestaurantFixture(runtimeConfig.discoveryFixtureScenario))
        : fetchPublicRestaurant(runtimeConfig.apiBaseUrl, runtimeConfig.restaurantSlug),
  });
}

export function usePublicBranchesQuery() {
  return useQuery({
    queryKey: publicQueryKeys.branches(runtimeConfig.restaurantSlug),
    queryFn: () =>
      runtimeConfig.useMenuFixture
        ? Promise.resolve(getBranchesFixture(runtimeConfig.discoveryFixtureScenario))
        : fetchPublicBranches(runtimeConfig.apiBaseUrl, runtimeConfig.restaurantSlug),
  });
}

export function usePublicMenuQuery(branchSlug: string | null) {
  return useQuery<PublicMenu>({
    queryKey: publicQueryKeys.menu(runtimeConfig.restaurantSlug, branchSlug ?? ''),
    queryFn: () => getPublicMenu({ branchSlug: branchSlug as string }),
    enabled: Boolean(branchSlug),
  });
}
