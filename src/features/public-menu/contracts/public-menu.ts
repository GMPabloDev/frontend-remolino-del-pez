import { z } from "zod";

import { publicSlugSchema } from "../../public-discovery/contracts/public-discovery.schemas";

export const dishAvailabilitySchema = z.enum(["available", "sold_out"]);

export const publicPriceSchema = z.string().regex(/^\d{1,8}\.\d{2}$/);

export const publicDishSchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	description: z.string(),
	imageUrl: z.url().nullable(),
	ingredients: z.array(z.string()),
	allergens: z.array(z.string()),
	position: z.number().int().positive(),
	price: publicPriceSchema,
	status: dishAvailabilitySchema,
});

export const publicMenuCategorySchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	position: z.number().int().positive(),
	dishes: z.array(publicDishSchema),
});

export const publicMenuSchema = z.object({
	restaurantSlug: publicSlugSchema,
	branchSlug: publicSlugSchema,
	categories: z.array(publicMenuCategorySchema),
});

export type DishAvailability = z.infer<typeof dishAvailabilitySchema>;
export type PublicDish = z.infer<typeof publicDishSchema>;
export type PublicMenuCategory = z.infer<typeof publicMenuCategorySchema>;
export type PublicMenu = z.infer<typeof publicMenuSchema>;
