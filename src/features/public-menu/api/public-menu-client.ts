import { requestPublicJson } from '../../public-api/api/request-public-json';
import { PublicApiClientError } from '../../public-api/contracts/api-error';
import { publicMenuSchema, type PublicMenu } from '../contracts/public-menu';
import type { ValidMenuQuery } from '../lib/menu-query';

export { PublicApiClientError as PublicMenuClientError } from '../../public-api/contracts/api-error';

export interface PublicMenuSlugQuery {
  restaurantSlug: string;
  branchSlug: string;
}

export function fetchPublicMenu(
  baseUrl: string,
  query: PublicMenuSlugQuery | ValidMenuQuery,
): Promise<PublicMenu> {
  const restaurantSlug = 'restaurantSlug' in query ? query.restaurantSlug : query.restaurantId;
  const branchSlug = 'branchSlug' in query ? query.branchSlug : query.branchId;

  return requestPublicJson(
    baseUrl,
    `public/restaurants/${encodeURIComponent(restaurantSlug)}/branches/${encodeURIComponent(branchSlug)}/menu`,
    publicMenuSchema,
    'No se pudo conectar con el menú.',
  );
}
