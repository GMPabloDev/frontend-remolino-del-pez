import type {
  ApiErrorResponse,
  PublicMenu,
} from '../contracts/public-menu';
import type { ValidMenuQuery } from '../lib/menu-query';

export class PublicMenuClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PublicMenuClientError';
  }
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!value || typeof value !== 'object' || !('error' in value)) {
    return false;
  }

  const error = value.error;

  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  );
}

async function readError(response: Response): Promise<PublicMenuClientError> {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (isApiErrorResponse(payload)) {
    return new PublicMenuClientError(
      response.status,
      payload.error.code,
      payload.error.message,
    );
  }

  return new PublicMenuClientError(
    response.status,
    'HTTP_ERROR',
    'No se pudo cargar el menú.',
  );
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
    throw new PublicMenuClientError(
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
