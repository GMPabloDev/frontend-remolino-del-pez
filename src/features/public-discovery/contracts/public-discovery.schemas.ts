import { z } from 'zod';

export const publicSlugSchema = z.string().trim().min(1);

export const publicRestaurantSchema = z.object({
  slug: publicSlugSchema,
  name: z.string(),
  phone: z.string().nullable(),
  email: z.email().nullable(),
  timezone: z.literal('America/Lima'),
});

export const branchRulesSchema = z.object({
  defaultReservationDurationMinutes: z.number().int().positive(),
  minimumAdvanceMinutes: z.number().int().positive(),
  maximumAdvanceDays: z.number().int().positive(),
  arrivalToleranceMinutes: z.number().int().positive(),
  maxPartySize: z.number().int().positive(),
});

export const branchIntervalSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  startTime: z.string(),
  endTime: z.string(),
});

export const publicBranchSchema = z.object({
  restaurantSlug: publicSlugSchema,
  branchSlug: publicSlugSchema,
  name: z.string(),
  address: z.string(),
  district: z.string(),
  province: z.string(),
  department: z.string(),
  phone: z.string(),
  email: z.email().nullable(),
  rules: branchRulesSchema,
  intervals: z.array(branchIntervalSchema),
});

export const publicBranchesSchema = z.array(publicBranchSchema);

export type PublicRestaurant = z.infer<typeof publicRestaurantSchema>;
export type BranchRules = z.infer<typeof branchRulesSchema>;
export type BranchInterval = z.infer<typeof branchIntervalSchema>;
export type PublicBranch = z.infer<typeof publicBranchSchema>;
