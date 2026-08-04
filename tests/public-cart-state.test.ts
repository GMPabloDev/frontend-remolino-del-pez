import { describe, expect, test } from "bun:test";

import { calculatePublicCartTotals } from "../src/features/public-cart/lib/public-cart-money";
import {
	decrementPublicCartItem,
	incrementPublicCartItem,
} from "../src/features/public-cart/lib/public-cart-state";

const item = {
	dishId: "dish-1",
	name: "Causa de pollo",
	imageUrl: null,
	unitPrice: "28.90",
	quantity: 1,
	availability: "available" as const,
	priceChanged: false,
};

describe("public cart state", () => {
	test("keeps quantity inside the inclusive limits", () => {
		const maxItem = { ...item, quantity: 99 };
		expect(incrementPublicCartItem([maxItem], item.dishId).reason).toBe(
			"quantity-limit",
		);
		expect(decrementPublicCartItem([item], item.dishId).reason).toBe(
			"minimum-quantity",
		);
	});

	test("calculates available subtotal independently of unavailable items", () => {
		expect(
			calculatePublicCartTotals([
				{ ...item, quantity: 2 },
				{
					...item,
					dishId: "dish-2",
					availability: "removed",
					quantity: 3,
				},
			]),
		).toEqual({
			selectedUnits: 5,
			availableUnits: 2,
			availableSubtotalCents: 5780,
			unavailableItemCount: 1,
		});
	});
});
