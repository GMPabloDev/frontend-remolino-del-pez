const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ValidMenuQuery {
  restaurantId: string;
  branchId: string;
}

export type MenuQueryResult =
  | { valid: true; value: ValidMenuQuery }
  | { valid: false; reason: 'missing' | 'invalid' };

function isUuid(value: string | null): value is string {
  return value !== null && UUID_PATTERN.test(value);
}

export function readMenuQuery(search: string): MenuQueryResult {
  const params = new URLSearchParams(search);
  const restaurantId = params.get('restaurantId');
  const branchId = params.get('branchId');

  if (!restaurantId || !branchId) {
    return { valid: false, reason: 'missing' };
  }

  if (!isUuid(restaurantId) || !isUuid(branchId)) {
    return { valid: false, reason: 'invalid' };
  }

  return {
    valid: true,
    value: { restaurantId, branchId },
  };
}
