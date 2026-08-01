import { PublicApiClientError, parseApiErrorResponse } from '../../public-api/contracts/api-error';
import type { PublicMenu } from '../contracts/public-menu';
import type { ValidMenuQuery } from '../lib/menu-query';

export { PublicApiClientError as PublicMenuClientError } from '../../public-api/contracts/api-error';

async function readError(response: Response): Promise<PublicApiClientError> {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  return parseApiErrorResponse(response.status, payload);
}

export async function fetchPublicMenu(
  baseUrl: string,
  query: ValidMenuQuery,
): Promise<PublicMenu> {
  const endpoint = new URL(
    `public/restaurants/${encodeURIComponent(query.restaurantId)}/branches/${encodeURIComponent(query.branchId)}/menu`,
    `${baseUrl}/`,
  );

  let response: Response;

  try {
    response = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new PublicApiClientError(
      0,
      'NETWORK_ERROR',
      'No se pudo conectar con el menú.',
    );
  }

  if (!response.ok) {
    throw await readError(response);
  }

  return response.json() as Promise<PublicMenu>;
}
