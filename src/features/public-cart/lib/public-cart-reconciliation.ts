import type { PublicMenu } from "../../public-menu/contracts/public-menu";
import type {
	CartReconciliationResult,
	PublicCartItem,
	StoredPublicCartItem,
} from "../contracts/public-cart.schemas";

export function reconcilePublicCart(
	items: ReadonlyArray<StoredPublicCartItem>,
	menu: PublicMenu,
): CartReconciliationResult {
	const dishes = new Map(
		menu.categories.flatMap((category) =>
			category.dishes.map((dish) => [dish.id, dish] as const),
		),
	);
	const changedPriceDishIds: string[] = [];
	const soldOutDishIds: string[] = [];
	const removedDishIds: string[] = [];

	const nextItems = items.map((item): PublicCartItem => {
		const dish = dishes.get(item.dishId);

		if (!dish) {
			removedDishIds.push(item.dishId);
			return {
				...item,
				availability: "removed",
				priceChanged: false,
			};
		}

		if (dish.status === "sold_out") {
			soldOutDishIds.push(item.dishId);
			return {
				...item,
				availability: "sold_out",
				priceChanged: false,
			};
		}

		const priceChanged = item.unitPrice !== dish.price;
		if (priceChanged) {
			changedPriceDishIds.push(item.dishId);
		}

		return {
			dishId: dish.id,
			name: dish.name,
			imageUrl: dish.imageUrl,
			unitPrice: dish.price,
			quantity: item.quantity,
			availability: "available",
			priceChanged,
		};
	});

	return {
		items: nextItems,
		changedPriceDishIds,
		soldOutDishIds,
		removedDishIds,
	};
}

export function markPublicCartItemsUnverified(
	items: ReadonlyArray<StoredPublicCartItem>,
): PublicCartItem[] {
	return items.map((item) => ({
		...item,
		availability: "unverified",
		priceChanged: false,
	}));
}
