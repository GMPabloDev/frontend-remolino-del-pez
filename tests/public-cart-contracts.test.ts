import { describe, expect, test } from "bun:test";

import {
	publicCartItemSchema,
	storedPublicCartSchema,
} from "../src/features/public-cart/contracts/public-cart.schemas";
import {
	calculatePublicCartTotals,
	formatPublicCartPrice,
	publicPriceToCents,
} from "../src/features/public-cart/lib/public-cart-money";
import { reconcilePublicCart } from "../src/features/public-cart/lib/public-cart-reconciliation";
import {
	addPublicCartItem,
	decrementPublicCartItem,
	incrementPublicCartItem,
	MAX_CART_ITEMS,
	MAX_CART_QUANTITY,
	removePublicCartItem,
} from "../src/features/public-cart/lib/public-cart-state";

const restaurantSlug = "restaurante-olimpico";
const branchSlug = "miraflores";
const availableDish = {
	id: "dish-1",
	name: "Causa de pollo",
	description: "Causa con pollo crocante.",
	imageUrl: null,
	ingredients: ["Papa"],
	allergens: ["Huevo"],
	position: 1,
	price: "28.90",
	status: "available" as const,
};

const storedItem = {
	dishId: availableDish.id,
	name: availableDish.name,
	imageUrl: availableDish.imageUrl,
	unitPrice: availableDish.price,
	quantity: 2,
};

const storedCart = {
	version: 1 as const,
	restaurantSlug,
	branchSlug,
	savedAt: "2026-08-04T10:00:00.000Z",
	expiresAt: "2026-08-11T10:00:00.000Z",
	items: [storedItem],
};

describe("public cart contracts", () => {
	test("validates a versioned cart and strips unknown fields", () => {
		expect(
			storedPublicCartSchema.parse({
				...storedCart,
				privateToken: "secret",
			}),
		).toEqual(storedCart);
		expect(
			publicCartItemSchema.parse({
				...storedItem,
				availability: "available",
				priceChanged: false,
			}),
		).toMatchObject({ dishId: availableDish.id });
	});

	test("rejects duplicate dishes, invalid prices and excessive quantities", () => {
		expect(() =>
			storedPublicCartSchema.parse({
				...storedCart,
				items: [storedItem, storedItem],
			}),
		).toThrow();
		expect(() =>
			publicCartItemSchema.parse({
				...storedItem,
				unitPrice: "12.5",
				availability: "available",
				priceChanged: false,
			}),
		).toThrow();
		expect(() =>
			publicCartItemSchema.parse({
				...storedItem,
				quantity: MAX_CART_QUANTITY + 1,
				availability: "available",
				priceChanged: false,
			}),
		).toThrow();
	});
});

describe("public cart state and money", () => {
	test("adds available dishes, increments and removes explicitly", () => {
		const added = addPublicCartItem([], availableDish);
		expect(added.reason).toBe("added");
		expect(added.items[0]?.quantity).toBe(1);

		const incremented = incrementPublicCartItem(added.items, availableDish.id);
		expect(incremented.items[0]?.quantity).toBe(2);

		const decremented = decrementPublicCartItem(
			incremented.items,
			availableDish.id,
		);
		expect(decremented.items[0]?.quantity).toBe(1);
		expect(
			removePublicCartItem(decremented.items, availableDish.id).items,
		).toEqual([]);
	});

	test("enforces unavailable, quantity and distinct-item limits", () => {
		expect(
			addPublicCartItem([], { ...availableDish, status: "sold_out" }).reason,
		).toBe("unavailable");
		const maxQuantityItem = { ...storedItem, quantity: MAX_CART_QUANTITY };
		expect(
			incrementPublicCartItem([maxQuantityItem], availableDish.id).reason,
		).toBe("quantity-limit");

		const fullItems = Array.from({ length: MAX_CART_ITEMS }, (_, index) => ({
			...storedItem,
			dishId: `dish-${index}`,
		}));
		expect(
			addPublicCartItem(fullItems, { ...availableDish, id: "dish-new" }).reason,
		).toBe("item-limit");
	});

	test("calculates subtotal with integer cents", () => {
		const items = [
			{
				...storedItem,
				availability: "available" as const,
				priceChanged: false,
			},
			{
				...storedItem,
				dishId: "dish-2",
				unitPrice: "10.10",
				quantity: 1,
				availability: "sold_out" as const,
				priceChanged: false,
			},
		];

		expect(publicPriceToCents("28.90")).toBe(2890);
		expect(calculatePublicCartTotals(items)).toEqual({
			selectedUnits: 3,
			availableUnits: 2,
			availableSubtotalCents: 5780,
			unavailableItemCount: 1,
		});
		expect(formatPublicCartPrice(5780)).toContain("57.80");
	});

	test("reconciles prices and availability without changing quantities", () => {
		const menu = {
			restaurantSlug,
			branchSlug,
			categories: [
				{
					id: "category-1",
					name: "Entradas",
					position: 1,
					dishes: [
						{ ...availableDish, price: "30.00" },
						{ ...availableDish, id: "dish-2", status: "sold_out" as const },
					],
				},
			],
		};
		const result = reconcilePublicCart(
			[storedItem, { ...storedItem, dishId: "dish-2" }],
			menu,
		);

		expect(result.changedPriceDishIds).toEqual([availableDish.id]);
		expect(result.soldOutDishIds).toEqual(["dish-2"]);
		expect(result.items[0]).toMatchObject({
			unitPrice: "30.00",
			quantity: 2,
			availability: "available",
			priceChanged: true,
		});
		expect(result.items[1]?.availability).toBe("sold_out");
	});
});
