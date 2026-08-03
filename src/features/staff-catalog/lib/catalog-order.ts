export interface CatalogOrderItem {
	id: string;
	position: number;
}

export interface CatalogOrderDraft {
	baseOrder: CatalogOrderItem[];
	orderedIds: string[];
}

export function getNextCatalogPosition(
	items: ReadonlyArray<Pick<CatalogOrderItem, "position">>,
): number {
	return (
		items.reduce(
			(maxPosition, item) => Math.max(maxPosition, item.position),
			0,
		) + 1
	);
}

export function createCatalogOrderDraft(
	items: ReadonlyArray<CatalogOrderItem>,
): CatalogOrderDraft {
	const orderedItems = [...items].sort(compareCatalogOrderItems);

	return {
		baseOrder: orderedItems.map(({ id, position }) => ({ id, position })),
		orderedIds: orderedItems.map(({ id }) => id),
	};
}

export function moveCatalogItem(
	orderedIds: ReadonlyArray<string>,
	activeId: string,
	overId: string,
): string[] {
	const sourceIndex = orderedIds.indexOf(activeId);
	const targetIndex = orderedIds.indexOf(overId);

	if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
		return [...orderedIds];
	}

	const nextOrder = [...orderedIds];
	const [movedId] = nextOrder.splice(sourceIndex, 1);
	if (movedId === undefined) return nextOrder;

	nextOrder.splice(targetIndex, 0, movedId);
	return nextOrder;
}

export function moveCatalogItemByOffset(
	orderedIds: ReadonlyArray<string>,
	itemId: string,
	offset: -1 | 1,
): string[] {
	const currentIndex = orderedIds.indexOf(itemId);
	if (currentIndex < 0) return [...orderedIds];

	const targetIndex = currentIndex + offset;
	if (targetIndex < 0 || targetIndex >= orderedIds.length) {
		return [...orderedIds];
	}

	return moveCatalogItem(orderedIds, itemId, orderedIds[targetIndex]);
}

export function normalizeCatalogOrder(
	orderedIds: ReadonlyArray<string>,
): CatalogOrderItem[] {
	return orderedIds.map((id, index) => ({
		id,
		position: index + 1,
	}));
}

export function getChangedCatalogOrder(
	baseOrder: ReadonlyArray<CatalogOrderItem>,
	orderedIds: ReadonlyArray<string>,
): CatalogOrderItem[] {
	const basePositions = new Map(
		baseOrder.map((item) => [item.id, item.position]),
	);

	return normalizeCatalogOrder(orderedIds).filter(
		(item) => basePositions.get(item.id) !== item.position,
	);
}

export function hasCatalogOrderConflict(
	baseOrder: ReadonlyArray<CatalogOrderItem>,
	currentOrder: ReadonlyArray<CatalogOrderItem>,
): boolean {
	if (baseOrder.length !== currentOrder.length) return true;

	const currentPositions = new Map(
		currentOrder.map((item) => [item.id, item.position]),
	);

	return baseOrder.some(
		(item) => currentPositions.get(item.id) !== item.position,
	);
}

function compareCatalogOrderItems(
	first: CatalogOrderItem,
	second: CatalogOrderItem,
): number {
	return first.position - second.position || first.id.localeCompare(second.id);
}
