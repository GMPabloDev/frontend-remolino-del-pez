import { z } from 'zod';

const menuQuerySchema = z
  .object({
    branch: z.string().trim().min(1),
  })
  .transform(({ branch }) => ({ branchSlug: branch }));

export type ValidMenuQuery = z.output<typeof menuQuerySchema>;

export type MenuQueryResult =
  | { valid: true; value: ValidMenuQuery }
  | { valid: false; reason: 'missing' | 'invalid' };

export function readMenuQuery(search: string): MenuQueryResult {
  const rawBranch = new URLSearchParams(search).get('branch');

  if (!rawBranch) {
    return { valid: false, reason: 'missing' };
  }

  const result = menuQuerySchema.safeParse({ branch: rawBranch });

  if (!result.success) {
    return { valid: false, reason: 'invalid' };
  }

  return { valid: true, value: result.data };
}
