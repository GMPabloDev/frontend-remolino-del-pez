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
import {
	createPublicReservationCartHandoff,
	writePublicReservationCartHandoff,
} from "../public-reservation/lib/public-reservation-storage";
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
	type CartMutationReason,
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
	announcement: string;
	isRestoring: boolean;
	persistence: PublicCartPersistence;
	persistenceWarning: boolean;
	restaurantSlug: string;
	branchSlug: string;
	reservationNavigationBlocked: boolean;
	prepareReservationNavigation(): boolean;
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
	const [announcement, setAnnouncement] = useState("");
	const [isRestoring, setIsRestoring] = useState(true);
	const [persistence, setPersistence] =
		useState<PublicCartPersistence>("persistent");
	const [reservationNavigationBlocked, setReservationNavigationBlocked] =
		useState(false);
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
			setAnnouncement("Tu selección se actualizó en otra pestaña.");
		}

		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, [branchSlug, cartKey, restaurantSlug]);

	const prepareReservationNavigation = useCallback((): boolean => {
		if (items.length === 0) {
			setReservationNavigationBlocked(true);
			return false;
		}

		if (persistence === "persistent") {
			setReservationNavigationBlocked(false);
			return true;
		}

		try {
			const cart = createStoredPublicCart({
				restaurantSlug,
				branchSlug,
				items: toStoredItems(items),
			});
			const handoff = createPublicReservationCartHandoff(
				restaurantSlug,
				branchSlug,
				cart,
			);
			const result = writePublicReservationCartHandoff(handoff);
			const ready = result.persistence === "persistent";

			setReservationNavigationBlocked(!ready);
			if (!ready) {
				setAnnouncement(
					"No pudimos conservar tu selección para abrir la reserva. Puedes volver a intentarlo.",
				);
			}
			return ready;
		} catch {
			setReservationNavigationBlocked(true);
			setAnnouncement(
				"No pudimos conservar tu selección para abrir la reserva. Puedes volver a intentarlo.",
			);
			return false;
		}
	}, [branchSlug, items, persistence, restaurantSlug]);

	const applyMutation = useCallback(
		(
			mutation: CartMutationResult,
			availability: PublicCartItem["availability"] = "unverified",
			updatedDish?: PublicDish,
		): CartMutationResult => {
			const mutationAnnouncement = getMutationAnnouncement(
				mutation.reason,
				items,
				mutation.items,
				updatedDish?.name,
			);
			setAnnouncement(mutationAnnouncement);

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
			setReservationNavigationBlocked(false);
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
			const reconciliationAnnouncement = getReconciliationAnnouncement(
				reconciliation,
				items,
				nextItems,
			);
			if (reconciliationAnnouncement) {
				setAnnouncement(reconciliationAnnouncement);
			}

			return reconciliation;
		},
		[branchSlug, items, persistItems, restaurantSlug],
	);

	const markItemsUnverified = useCallback(() => {
		setReservationNavigationBlocked(false);
		setItems((currentItems) =>
			currentItems.map((item) => ({
				...item,
				availability: "unverified" as const,
			})),
		);
		setAnnouncement(
			"La disponibilidad de tu selección está pendiente de verificación.",
		);
	}, []);

	const totals = useMemo(() => calculatePublicCartTotals(items), [items]);
	const contextValue = useMemo<PublicCartContextValue>(
		() => ({
			items,
			totals,
			announcement,
			restaurantSlug,
			branchSlug,

			isRestoring,
			persistence,
			persistenceWarning: persistence === "memory",
			reservationNavigationBlocked,
			prepareReservationNavigation,
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
			announcement,
			branchSlug,
			clearCart,
			decrementItem,
			incrementItem,
			isRestoring,
			items,
			markItemsUnverified,
			persistence,
			prepareReservationNavigation,
			reconcileMenu,
			removeItem,
			reservationNavigationBlocked,
			restaurantSlug,
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

function getMutationAnnouncement(
	reason: CartMutationReason,
	previousItems: ReadonlyArray<PublicCartItem>,
	nextItems: ReadonlyArray<StoredPublicCartItem>,
	updatedDishName?: string,
): string {
	const changedItem = nextItems.find((item) => {
		const previousItem = previousItems.find(
			(currentItem) => currentItem.dishId === item.dishId,
		);
		return previousItem?.quantity !== item.quantity;
	});
	const removedItem = previousItems.find(
		(item) => !nextItems.some((nextItem) => nextItem.dishId === item.dishId),
	);
	const itemName =
		updatedDishName ?? changedItem?.name ?? removedItem?.name ?? "este plato";
	const quantity = changedItem?.quantity;

	switch (reason) {
		case "added":
			return `Añadido ${itemName} al carrito.`;
		case "incremented":
			return `Cantidad de ${itemName}: ${quantity ?? 1}.`;
		case "decremented":
			return `Cantidad de ${itemName}: ${quantity ?? 1}.`;
		case "removed":
			return `Eliminado ${itemName} del carrito.`;
		case "cleared":
			return "Carrito vacío.";
		case "quantity-limit":
			return `No se puede aumentar ${itemName}: máximo 99 unidades.`;
		case "item-limit":
			return "No se pueden añadir más de 50 platos distintos.";
		case "unavailable":
			return `${itemName} no está disponible para selección.`;
		case "item-not-found":
			return "El plato ya no está en el carrito.";
		case "minimum-quantity":
			return `La cantidad mínima de ${itemName} es 1. Usa Eliminar para retirarlo.`;
	}
}

function getReconciliationAnnouncement(
	reconciliation: CartReconciliationResult,
	previousItems: ReadonlyArray<PublicCartItem>,
	nextItems: ReadonlyArray<PublicCartItem>,
): string {
	const getNames = (dishIds: ReadonlyArray<string>) =>
		dishIds
			.map(
				(dishId) =>
					nextItems.find((item) => item.dishId === dishId)?.name ??
					previousItems.find((item) => item.dishId === dishId)?.name,
			)
			.filter((name): name is string => Boolean(name));
	const messages: string[] = [];
	const changedPriceNames = getNames(reconciliation.changedPriceDishIds);
	const soldOutNames = getNames(reconciliation.soldOutDishIds);
	const removedNames = getNames(reconciliation.removedDishIds);

	if (changedPriceNames.length > 0) {
		messages.push(`Precio actualizado para ${changedPriceNames.join(", ")}.`);
	}
	if (soldOutNames.length > 0) {
		messages.push(`${soldOutNames.join(", ")} ahora está agotado.`);
	}
	if (removedNames.length > 0) {
		messages.push(`${removedNames.join(", ")} ya no está publicado.`);
	}

	return messages.join(" ");
}
