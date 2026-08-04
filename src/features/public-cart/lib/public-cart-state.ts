import type { PublicDish } from "../../public-menu/contracts/public-menu";
import type { StoredPublicCartItem } from "../contracts/public-cart.schemas";

export const MIN_CART_QUANTITY = 1;
export const MAX_CART_QUANTITY = 99;
export const MAX_CART_ITEMS = 50;

export type CartMutationReason =
	| "added"
	| "incremented"
	| "decremented"
	| "removed"
	| "cleared"
	| "quantity-limit"
	| "item-limit"
	| "unavailable"
	| "item-not-found"
	| "minimum-quantity";

export interface CartMutationResult {
	items: StoredPublicCartItem[];
	changed: boolean;
	reason: CartMutationReason;
}

export function addPublicCartItem(
	items: ReadonlyArray<StoredPublicCartItem>,
	dish: Pick<PublicDish, "id" | "name" | "imageUrl" | "price" | "status">,
): CartMutationResult {
	if (dish.status !== "available") {
		return createUnchangedResult(items, "unavailable");
	}

	const currentIndex = items.findIndex((item) => item.dishId === dish.id);
	if (currentIndex < 0) {
		if (items.length >= MAX_CART_ITEMS) {
			return createUnchangedResult(items, "item-limit");
		}

		return {
			items: [...items, createCartItem(dish)],
			changed: true,
			reason: "added",
		};
	}

	const currentItem = items[currentIndex];
	if (!currentItem || currentItem.quantity >= MAX_CART_QUANTITY) {
		return createUnchangedResult(items, "quantity-limit");
	}

	const nextItems = [...items];
	nextItems[currentIndex] = {
		...createCartItem(dish),
		quantity: currentItem.quantity + 1,
	};

	return {
		items: nextItems,
		changed: true,
		reason: "incremented",
	};
}

export function incrementPublicCartItem(
	items: ReadonlyArray<StoredPublicCartItem>,
	dishId: string,
): CartMutationResult {
	const currentIndex = items.findIndex((item) => item.dishId === dishId);
	const currentItem = currentIndex >= 0 ? items[currentIndex] : undefined;

	if (!currentItem) {
		return createUnchangedResult(items, "item-not-found");
	}

	if (currentItem.quantity >= MAX_CART_QUANTITY) {
		return createUnchangedResult(items, "quantity-limit");
	}

	return updateQuantity(
		items,
		currentIndex,
		currentItem.quantity + 1,
		"incremented",
	);
}

export function decrementPublicCartItem(
	items: ReadonlyArray<StoredPublicCartItem>,
	dishId: string,
): CartMutationResult {
	const currentIndex = items.findIndex((item) => item.dishId === dishId);
	const currentItem = currentIndex >= 0 ? items[currentIndex] : undefined;

	if (!currentItem) {
		return createUnchangedResult(items, "item-not-found");
	}

	if (currentItem.quantity <= MIN_CART_QUANTITY) {
		return createUnchangedResult(items, "minimum-quantity");
	}

	return updateQuantity(
		items,
		currentIndex,
		currentItem.quantity - 1,
		"decremented",
	);
}

export function removePublicCartItem(
	items: ReadonlyArray<StoredPublicCartItem>,
	dishId: string,
): CartMutationResult {
	const currentIndex = items.findIndex((item) => item.dishId === dishId);
	if (currentIndex < 0) {
		return createUnchangedResult(items, "item-not-found");
	}

	return {
		items: items.filter((_, index) => index !== currentIndex),
		changed: true,
		reason: "removed",
	};
}

export function clearPublicCart(
	items: ReadonlyArray<StoredPublicCartItem>,
): CartMutationResult {
	if (items.length === 0) {
		return createUnchangedResult(items, "cleared");
	}

	return {
		items: [],
		changed: true,
		reason: "cleared",
	};
}

function createCartItem(
	dish: Pick<PublicDish, "id" | "name" | "imageUrl" | "price">,
): StoredPublicCartItem {
	return {
		dishId: dish.id,
		name: dish.name,
		imageUrl: dish.imageUrl,
		unitPrice: dish.price,
		quantity: MIN_CART_QUANTITY,
	};
}

function updateQuantity(
	items: ReadonlyArray<StoredPublicCartItem>,
	index: number,
	quantity: number,
	reason: Extract<CartMutationReason, "incremented" | "decremented">,
): CartMutationResult {
	const nextItems = [...items];
	const currentItem = nextItems[index];

	if (!currentItem) {
		return createUnchangedResult(items, "item-not-found");
	}

	nextItems[index] = { ...currentItem, quantity };

	return {
		items: nextItems,
		changed: true,
		reason,
	};
}

function createUnchangedResult(
	items: ReadonlyArray<StoredPublicCartItem>,
	reason: CartMutationReason,
): CartMutationResult {
	return {
		items: [...items],
		changed: false,
		reason,
	};
}
