import { z } from "zod";

import { publicSlugSchema } from "../../public-discovery/contracts/public-discovery.schemas";
import { publicPriceSchema } from "../../public-menu/contracts/public-menu";

export const cartPriceSchema = publicPriceSchema;

export const storedPublicCartItemSchema = z.object({
	dishId: z.string().min(1),
	name: z.string().min(1),
	imageUrl: z.url().nullable(),
	unitPrice: cartPriceSchema,
	quantity: z.number().int().min(1).max(99),
});

export const storedPublicCartSchema = z
	.object({
		version: z.literal(1),
		restaurantSlug: publicSlugSchema,
		branchSlug: publicSlugSchema,
		savedAt: z.iso.datetime({ offset: true }),
		expiresAt: z.iso.datetime({ offset: true }),
		items: z.array(storedPublicCartItemSchema).max(50),
	})
	.superRefine((cart, context) => {
		const dishIds = new Set<string>();

		for (const [index, item] of cart.items.entries()) {
			if (dishIds.has(item.dishId)) {
				context.addIssue({
					code: "custom",
					path: ["items", index, "dishId"],
					message: "Each dish can appear only once in the cart.",
				});
			}

			dishIds.add(item.dishId);
		}
	});

export const cartItemAvailabilitySchema = z.enum([
	"available",
	"sold_out",
	"removed",
	"unverified",
]);

export const publicCartItemSchema = storedPublicCartItemSchema.extend({
	availability: cartItemAvailabilitySchema,
	priceChanged: z.boolean(),
});

export type StoredPublicCartItem = z.infer<typeof storedPublicCartItemSchema>;
export type StoredPublicCart = z.infer<typeof storedPublicCartSchema>;
export type CartItemAvailability = z.infer<typeof cartItemAvailabilitySchema>;
export type PublicCartItem = z.infer<typeof publicCartItemSchema>;

export interface CartReconciliationResult {
	items: PublicCartItem[];
	changedPriceDishIds: string[];
	soldOutDishIds: string[];
	removedDishIds: string[];
}

export interface PublicCartTotals {
	selectedUnits: number;
	availableUnits: number;
	availableSubtotalCents: number;
	unavailableItemCount: number;
}
