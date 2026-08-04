import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

import type {
	PublicDish,
	PublicMenu,
} from "../public-menu/contracts/public-menu";
import type {
	CartReconciliationResult,
	PublicCartItem,
	PublicCartTotals,
	StoredPublicCartItem,
} from "./contracts/public-cart.schemas";
import { calculatePublicCartTotals } from "./lib/public-cart-money";
import {
	markPublicCartItemsUnverified,
	reconcilePublicCart,
} from "./lib/public-cart-reconciliation";
import {
	addPublicCartItem,
	type CartMutationResult,
	clearPublicCart,
	decrementPublicCartItem,
	incrementPublicCartItem,
	removePublicCartItem,
} from "./lib/public-cart-state";
import {
	createStoredPublicCart,
	getPublicCartKey,
	type PublicCartPersistence,
	readPublicCart,
	writePublicCart,
} from "./lib/public-cart-storage";

interface PublicCartProviderProps extends PropsWithChildren {
	restaurantSlug: string;
	branchSlug: string;
}

interface PublicCartContextValue {
	items: PublicCartItem[];
	totals: PublicCartTotals;
	isRestoring: boolean;
	persistence: PublicCartPersistence;
	persistenceWarning: boolean;
	addItem(dish: PublicDish): CartMutationResult;
	incrementItem(dishId: string): CartMutationResult;
	decrementItem(dishId: string): CartMutationResult;
	removeItem(dishId: string): CartMutationResult;
	clearCart(): CartMutationResult;
	reconcileMenu(menu: PublicMenu): CartReconciliationResult | null;
	markItemsUnverified(): void;
}

const PublicCartContext = createContext<PublicCartContextValue | null>(null);

export function PublicCartProvider({
	restaurantSlug,
	branchSlug,
	children,
}: PublicCartProviderProps) {
	const [items, setItems] = useState<PublicCartItem[]>([]);
	const [isRestoring, setIsRestoring] = useState(true);
	const [persistence, setPersistence] =
		useState<PublicCartPersistence>("persistent");
	const cartKey = getPublicCartKey(restaurantSlug, branchSlug);

	const persistItems = useCallback(
		(nextItems: ReadonlyArray<PublicCartItem>) => {
			const storedCart = createStoredPublicCart({
				restaurantSlug,
				branchSlug,
				items: toStoredItems(nextItems),
			});
			const result = writePublicCart(storedCart);
			setPersistence(result.persistence);
		},
		[branchSlug, restaurantSlug],
	);

	useEffect(() => {
		const result = readPublicCart(restaurantSlug, branchSlug);
		setPersistence(result.persistence);
		setItems(
			result.cart ? markPublicCartItemsUnverified(result.cart.items) : [],
		);
		setIsRestoring(false);
	}, [branchSlug, restaurantSlug]);

	useEffect(() => {
		function handleStorage(event: StorageEvent) {
			if (event.key !== cartKey) return;

			const result = readPublicCart(restaurantSlug, branchSlug);
			setPersistence(result.persistence);
			setItems(
				result.cart ? markPublicCartItemsUnverified(result.cart.items) : [],
			);
		}

		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, [branchSlug, cartKey, restaurantSlug]);

	const applyMutation = useCallback(
		(
			mutation: CartMutationResult,
			availability: PublicCartItem["availability"] = "unverified",
			updatedDish?: PublicDish,
		): CartMutationResult => {
			if (!mutation.changed) return mutation;

			const nextItems = mutation.items.map((item) => {
				const previousItem = items.find(
					(currentItem) => currentItem.dishId === item.dishId,
				);
				const isUpdatedDish = updatedDish?.id === item.dishId;
				const priceChanged = isUpdatedDish
					? previousItem?.unitPrice !== item.unitPrice ||
						Boolean(previousItem?.priceChanged)
					: Boolean(previousItem?.priceChanged);

				return {
					...item,
					availability: isUpdatedDish
						? "available"
						: (previousItem?.availability ?? availability),
					priceChanged,
				};
			});

			setItems(nextItems);
			persistItems(nextItems);
			return mutation;
		},
		[items, persistItems],
	);

	const addItem = useCallback(
		(dish: PublicDish) =>
			applyMutation(
				addPublicCartItem(toStoredItems(items), dish),
				"unverified",
				dish,
			),
		[applyMutation, items],
	);

	const incrementItem = useCallback(
		(dishId: string) =>
			applyMutation(incrementPublicCartItem(toStoredItems(items), dishId)),
		[applyMutation, items],
	);

	const decrementItem = useCallback(
		(dishId: string) =>
			applyMutation(decrementPublicCartItem(toStoredItems(items), dishId)),
		[applyMutation, items],
	);

	const removeItem = useCallback(
		(dishId: string) =>
			applyMutation(removePublicCartItem(toStoredItems(items), dishId)),
		[applyMutation, items],
	);

	const clearCart = useCallback(
		() => applyMutation(clearPublicCart(toStoredItems(items))),
		[applyMutation, items],
	);

	const reconcileMenu = useCallback(
		(menu: PublicMenu): CartReconciliationResult | null => {
			if (
				menu.restaurantSlug !== restaurantSlug ||
				menu.branchSlug !== branchSlug
			) {
				return null;
			}

			const reconciliation = reconcilePublicCart(toStoredItems(items), menu);
			const nextItems = reconciliation.items.map((item) => ({
				...item,
				priceChanged:
					item.priceChanged ||
					Boolean(
						items.find((currentItem) => currentItem.dishId === item.dishId)
							?.priceChanged,
					),
			}));
			const currentStoredItems = toStoredItems(items);

			if (!areCartItemsEqual(items, nextItems)) {
				setItems(nextItems);
			}
			if (!areStoredItemsEqual(currentStoredItems, toStoredItems(nextItems))) {
				persistItems(nextItems);
			}

			return reconciliation;
		},
		[branchSlug, items, persistItems, restaurantSlug],
	);

	const markItemsUnverified = useCallback(() => {
		setItems((currentItems) =>
			currentItems.map((item) => ({
				...item,
				availability: "unverified",
			})),
		);
	}, []);

	const totals = useMemo(() => calculatePublicCartTotals(items), [items]);
	const contextValue = useMemo<PublicCartContextValue>(
		() => ({
			items,
			totals,
			isRestoring,
			persistence,
			persistenceWarning: persistence === "memory",
			addItem,
			incrementItem,
			decrementItem,
			removeItem,
			clearCart,
			reconcileMenu,
			markItemsUnverified,
		}),
		[
			addItem,
			clearCart,
			decrementItem,
			incrementItem,
			isRestoring,
			items,
			markItemsUnverified,
			persistence,
			reconcileMenu,
			removeItem,
			totals,
		],
	);

	return (
		<PublicCartContext.Provider value={contextValue}>
			{children}
		</PublicCartContext.Provider>
	);
}

export function usePublicCart(): PublicCartContextValue {
	const context = useContext(PublicCartContext);
	if (!context) {
		throw new Error("usePublicCart must be used inside PublicCartProvider.");
	}

	return context;
}

function toStoredItems(
	items: ReadonlyArray<PublicCartItem>,
): StoredPublicCartItem[] {
	return items.map((item) => ({
		dishId: item.dishId,
		name: item.name,
		imageUrl: item.imageUrl,
		unitPrice: item.unitPrice,
		quantity: item.quantity,
	}));
}

function areCartItemsEqual(
	firstItems: ReadonlyArray<PublicCartItem>,
	secondItems: ReadonlyArray<PublicCartItem>,
): boolean {
	return JSON.stringify(firstItems) === JSON.stringify(secondItems);
}

function areStoredItemsEqual(
	firstItems: ReadonlyArray<StoredPublicCartItem>,
	secondItems: ReadonlyArray<StoredPublicCartItem>,
): boolean {
	return JSON.stringify(firstItems) === JSON.stringify(secondItems);
}
