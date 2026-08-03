import type { DragEndEvent } from "@dnd-kit/react";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { MenuCategory } from "../contracts/staff-catalog.schemas";
import { moveCatalogItem, moveCatalogItemByOffset } from "../lib/catalog-order";

interface SortableCategoryListProps {
	categories: MenuCategory[];
	disabled?: boolean;
	orderedIds?: string[];
	onOrderChange: (orderedIds: string[]) => void;
}

export function SortableCategoryList({
	categories,
	disabled = false,
	orderedIds: controlledOrderedIds,
	onOrderChange,
}: SortableCategoryListProps) {
	const initialOrder = useMemo(
		() => categories.map((category) => category.id),
		[categories],
	);
	const [localOrderedIds, setLocalOrderedIds] = useState(initialOrder);
	const orderedIds = controlledOrderedIds ?? localOrderedIds;
	const [announcement, setAnnouncement] = useState("");
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

	useEffect(() => {
		if (!controlledOrderedIds) setLocalOrderedIds(initialOrder);
	}, [controlledOrderedIds, initialOrder]);

	useEffect(() => {
		if (typeof window.matchMedia !== "function") return;

		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		const updateMotionPreference = () =>
			setPrefersReducedMotion(mediaQuery.matches);

		updateMotionPreference();
		mediaQuery.addEventListener("change", updateMotionPreference);
		return () =>
			mediaQuery.removeEventListener("change", updateMotionPreference);
	}, []);

	const categoriesById = new Map(
		categories.map((category) => [category.id, category]),
	);
	const orderedCategories = orderedIds
		.map((id) => categoriesById.get(id))
		.filter((category): category is MenuCategory => category !== undefined);

	function applyOrder(nextOrder: string[], movedId?: string): void {
		if (sameOrder(orderedIds, nextOrder)) return;

		if (!controlledOrderedIds) setLocalOrderedIds(nextOrder);
		onOrderChange(nextOrder);

		if (movedId) {
			const category = categoriesById.get(movedId);
			const nextPosition = nextOrder.indexOf(movedId) + 1;
			if (category && nextPosition > 0) {
				setAnnouncement(
					`${category.name} quedó en la posición ${nextPosition}.`,
				);
			}
		}
	}

	function handleDragEnd(event: DragEndEvent): void {
		if (event.canceled) {
			setAnnouncement("Ordenamiento cancelado.");
			return;
		}

		const sourceId = event.operation.source?.id;
		const targetId = event.operation.target?.id;
		if (sourceId === undefined || targetId === undefined) return;

		const nextOrder = moveCatalogItem(
			orderedIds,
			String(sourceId),
			String(targetId),
		);
		applyOrder(nextOrder, String(sourceId));
	}

	return (
		<DragDropProvider onDragEnd={handleDragEnd}>
			<div className="space-y-3">
				<p className="text-sm text-[#12324a]/65">
					Arrastra una categoría para cambiar su orden. También puedes usar las
					acciones Subir y Bajar.
				</p>
				<p className="sr-only" id="catalog-category-sort-instructions">
					Enfoca el control de arrastre y pulsa Enter o Espacio para comenzar.
					Usa las flechas para mover la categoría y Enter o Espacio para
					confirmar.
				</p>
				<div aria-live="polite" className="sr-only">
					{announcement}
				</div>
				<ol aria-label="Orden de categorías" className="space-y-3">
					{orderedCategories.map((category, index) => (
						<SortableCategoryItem
							category={category}
							index={index}
							isFirst={index === 0}
							isLast={index === orderedCategories.length - 1}
							key={category.id}
							disabled={disabled}
							onMove={(offset) => {
								const nextOrder = moveCatalogItemByOffset(
									orderedIds,
									category.id,
									offset,
								);
								applyOrder(nextOrder, category.id);
							}}
							prefersReducedMotion={prefersReducedMotion}
						/>
					))}
				</ol>
			</div>
		</DragDropProvider>
	);
}

function SortableCategoryItem({
	category,
	index,
	isFirst,
	isLast,
	disabled,
	onMove,
	prefersReducedMotion,
}: {
	category: MenuCategory;
	index: number;
	isFirst: boolean;
	isLast: boolean;
	disabled: boolean;
	onMove: (offset: -1 | 1) => void;
	prefersReducedMotion: boolean;
}) {
	const { ref, handleRef, isDragging } = useSortable({
		id: category.id,
		index,
		group: "menu-categories",
		data: { label: category.name },
		disabled,
		transition: prefersReducedMotion ? null : { duration: 220 },
	});

	return (
		<li
			aria-posinset={index + 1}
			className={`flex items-center gap-3 rounded-2xl border border-[#12324a]/10 bg-white/90 p-4 shadow-[0_12px_32px_rgba(18,50,74,0.05)] transition ${isDragging ? "border-[#e76832]/50 shadow-[0_16px_36px_rgba(231,104,50,0.16)]" : ""}`}
			ref={ref}
		>
			<button
				aria-describedby="catalog-category-sort-instructions"
				aria-label={`Arrastrar categoría ${category.name}. Posición ${index + 1}`}
				className="inline-flex min-h-11 min-w-11 shrink-0 cursor-grab items-center justify-center rounded-xl border border-[#12324a]/10 text-[#12324a]/55 transition hover:border-[#12324a]/25 hover:text-[#12324a] focus-visible:cursor-grabbing focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35 disabled:cursor-not-allowed disabled:opacity-45"
				disabled={disabled}
				ref={handleRef}
				type="button"
			>
				<GripVertical aria-hidden="true" />
			</button>
			<div className="min-w-0 flex-1">
				<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e76832]">
					Posición {index + 1}
				</p>
				<p className="mt-1 truncate font-semibold text-[#12324a]">
					{category.name}
				</p>
				<a
					className="mt-2 inline-flex text-xs font-semibold text-[#236d7d] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e76832]/35"
					href={`/staff/catalog/categories/${encodeURIComponent(category.id)}`}
				>
					Administrar categoría
				</a>
			</div>
			<div className="flex shrink-0 gap-2">
				<Button
					aria-label={`Subir ${category.name}`}
					disabled={disabled || isFirst}
					onClick={() => onMove(-1)}
					size="icon"
					variant="outline"
				>
					<ArrowUp aria-hidden="true" />
				</Button>
				<Button
					aria-label={`Bajar ${category.name}`}
					disabled={disabled || isLast}
					onClick={() => onMove(1)}
					size="icon"
					variant="outline"
				>
					<ArrowDown aria-hidden="true" />
				</Button>
			</div>
		</li>
	);
}

function sameOrder(first: string[], second: string[]): boolean {
	return (
		first.length === second.length &&
		first.every((id, index) => id === second[index])
	);
}
