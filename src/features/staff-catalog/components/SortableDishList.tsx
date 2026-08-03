import type { DragEndEvent } from "@dnd-kit/react";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { StaffSessionAccess } from "@/features/staff-auth/session/staff-session";
import { useStaffUnsavedChanges } from "@/features/staff-shell/components/StaffUnsavedChangesProvider";
import { ApiClientError } from "@/lib/api/api-error";
import type { StaffDish } from "../contracts/staff-catalog.schemas";
import {
	type CatalogOrderItem,
	createCatalogOrderDraft,
	getChangedCatalogOrder,
	moveCatalogItem,
	moveCatalogItemByOffset,
	normalizeCatalogOrder,
} from "../lib/catalog-order";
import {
	hasCatalogDraftOrderConflict,
	readStaffCatalogDraft,
	removeStaffCatalogDraft,
	saveStaffCatalogDraft,
} from "../lib/staff-catalog-drafts";
import { useUpdateDishOrderMutation } from "../query/staff-catalog-query";
import { CatalogStatusBadge } from "./CatalogStatusBadge";

const catalogOrderValuesSchema = z.array(z.uuid());
const catalogOrderBaseSchema = z.array(
	z.object({ id: z.uuid(), position: z.number().int().positive() }),
);

interface SortableDishListProps {
	dishes: StaffDish[];
	session: StaffSessionAccess;
	userId: string;
}

export function SortableDishList({
	dishes,
	session,
	userId,
}: SortableDishListProps) {
	const orderMutation = useUpdateDishOrderMutation(session);
	const serverOrder = useMemo(() => createCatalogOrderDraft(dishes), [dishes]);
	const [baseOrder, setBaseOrder] = useState<CatalogOrderItem[]>(
		serverOrder.baseOrder,
	);
	const [orderedIds, setOrderedIds] = useState(serverOrder.orderedIds);
	const [draft, setDraft] = useState<{
		base: CatalogOrderItem[];
		values: string[];
	} | null>(null);
	const [announcement, setAnnouncement] = useState("");
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
	const isOrderDirty = getChangedCatalogOrder(baseOrder, orderedIds).length > 0;
	const hasDraftConflict = draft
		? hasCatalogDraftOrderConflict(draft.base, serverOrder.baseOrder)
		: false;

	useStaffUnsavedChanges(
		`dish-order-${dishes[0]?.categoryId ?? "unknown"}`,
		isOrderDirty,
	);

	useEffect(() => {
		if (isOrderDirty) return;
		setBaseOrder(serverOrder.baseOrder);
		setOrderedIds(serverOrder.orderedIds);
	}, [isOrderDirty, serverOrder]);

	useEffect(() => {
		setDraft(
			readStaffCatalogDraft({
				userId,
				section: "dish-order",
				resourceId: dishes[0]?.categoryId ?? null,
				valuesSchema: catalogOrderValuesSchema,
				baseSchema: catalogOrderBaseSchema,
			}),
		);
	}, [dishes, userId]);

	useEffect(() => {
		if (!isOrderDirty || !dishes[0]?.categoryId) return;
		saveStaffCatalogDraft({
			userId,
			section: "dish-order",
			resourceId: dishes[0].categoryId,
			base: baseOrder,
			values: orderedIds,
			valuesSchema: catalogOrderValuesSchema,
			baseSchema: catalogOrderBaseSchema,
		});
	}, [baseOrder, dishes, isOrderDirty, orderedIds, userId]);

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

	function applyOrder(nextOrder: string[], movedId?: string): void {
		if (sameOrder(orderedIds, nextOrder)) return;
		if (getChangedCatalogOrder(baseOrder, orderedIds).length === 0) {
			setBaseOrder(serverOrder.baseOrder);
		}
		setOrderedIds(nextOrder);
		if (movedId) {
			const dish = dishes.find((item) => item.id === movedId);
			const nextPosition = nextOrder.indexOf(movedId) + 1;
			if (dish && nextPosition > 0) {
				setAnnouncement(`${dish.name} quedó en la posición ${nextPosition}.`);
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
		applyOrder(
			moveCatalogItem(orderedIds, String(sourceId), String(targetId)),
			String(sourceId),
		);
	}

	async function saveOrder(): Promise<void> {
		try {
			await orderMutation.mutateAsync({ baseOrder, dishes, orderedIds });
			const savedOrder = normalizeCatalogOrder(orderedIds);
			setBaseOrder(savedOrder);
			setOrderedIds(savedOrder.map((item) => item.id));
			if (dishes[0]?.categoryId) {
				removeStaffCatalogDraft(userId, "dish-order", dishes[0].categoryId);
			}
			setDraft(null);
			toast.success("El orden de los platos fue guardado.");
		} catch (error) {
			setBaseOrder(serverOrder.baseOrder);
			setOrderedIds(serverOrder.orderedIds);
			toast.error(getOrderErrorMessage(error));
		}
	}

	function recoverDraft(): void {
		if (!draft) return;
		const currentIds = new Set(serverOrder.orderedIds);
		const recoveredIds = draft.values.filter((id) => currentIds.has(id));
		const missingIds = serverOrder.orderedIds.filter(
			(id) => !recoveredIds.includes(id),
		);
		setBaseOrder(draft.base);
		setOrderedIds([...recoveredIds, ...missingIds]);
		setDraft(null);
	}

	function discardDraft(): void {
		if (dishes[0]?.categoryId) {
			removeStaffCatalogDraft(userId, "dish-order", dishes[0].categoryId);
		}
		setDraft(null);
		setBaseOrder(serverOrder.baseOrder);
		setOrderedIds(serverOrder.orderedIds);
	}

	const dishesById = new Map(dishes.map((dish) => [dish.id, dish]));
	const orderedDishes = orderedIds
		.map((id) => dishesById.get(id))
		.filter((dish): dish is StaffDish => dish !== undefined);

	return (
		<section className="space-y-5">
			<DragDropProvider onDragEnd={handleDragEnd}>
				<div className="space-y-3">
					<p className="text-sm text-[#12324a]/65">
						Arrastra un plato para cambiar su orden dentro de esta categoría.
						También puedes usar Subir y Bajar.
					</p>
					<p className="sr-only" id="catalog-dish-sort-instructions">
						Enfoca el control de arrastre y pulsa Enter o Espacio para comenzar.
						Usa las flechas para mover el plato y Enter o Espacio para
						confirmar.
					</p>
					<div aria-live="polite" className="sr-only">
						{announcement}
					</div>
					<ol
						aria-label={`Orden de platos de ${dishes[0]?.categoryName ?? "la categoría"}`}
						className="space-y-3"
					>
						{orderedDishes.map((dish, index) => (
							<SortableDishItem
								dish={dish}
								index={index}
								isFirst={index === 0}
								isLast={index === orderedDishes.length - 1}
								key={dish.id}
								onMove={(offset) =>
									applyOrder(
										moveCatalogItemByOffset(orderedIds, dish.id, offset),
										dish.id,
									)
								}
								prefersReducedMotion={prefersReducedMotion}
							/>
						))}
					</ol>
				</div>
			</DragDropProvider>
			<div className="flex flex-col gap-3 border-t border-[#12324a]/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-sm text-[#12324a]/65">
					{isOrderDirty
						? "Tienes cambios de orden pendientes de guardar."
						: "El orden actual está sincronizado con el servidor."}
				</p>
				<Button
					disabled={!isOrderDirty || orderMutation.isPending}
					onClick={() => void saveOrder()}
				>
					{orderMutation.isPending ? "Guardando orden…" : "Guardar orden"}
				</Button>
			</div>
			<AlertDialog open={draft !== null} onOpenChange={() => undefined}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{hasDraftConflict
								? "El orden tiene un borrador desactualizado"
								: "Encontramos un borrador de orden"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{hasDraftConflict
								? "Los platos cambiaron en el servidor desde que guardaste este orden. ¿Quieres recuperar tu versión?"
								: "Hay un orden de platos que no terminaste de guardar. Puedes recuperarlo o descartarlo."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={discardDraft}>
							Descartar
						</AlertDialogCancel>
						<AlertDialogAction onClick={recoverDraft}>
							Recuperar borrador
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}

function SortableDishItem({
	dish,
	index,
	isFirst,
	isLast,
	onMove,
	prefersReducedMotion,
}: {
	dish: StaffDish;
	index: number;
	isFirst: boolean;
	isLast: boolean;
	onMove: (offset: -1 | 1) => void;
	prefersReducedMotion: boolean;
}) {
	const { ref, handleRef, isDragging } = useSortable({
		id: dish.id,
		index,
		group: `menu-dishes-${dish.categoryId}`,
		data: { label: dish.name },
		transition: prefersReducedMotion ? null : { duration: 220 },
	});

	return (
		<li
			aria-posinset={index + 1}
			className={`flex items-center gap-3 rounded-2xl border border-[#12324a]/10 bg-white/90 p-4 shadow-[0_12px_32px_rgba(18,50,74,0.05)] transition ${isDragging ? "border-[#e76832]/50 shadow-[0_16px_36px_rgba(231,104,50,0.16)]" : ""}`}
			ref={ref}
		>
			<button
				aria-describedby="catalog-dish-sort-instructions"
				aria-label={`Arrastrar plato ${dish.name}. Posición ${index + 1}`}
				className="inline-flex min-h-11 min-w-11 shrink-0 cursor-grab items-center justify-center rounded-xl border border-[#12324a]/10 text-[#12324a]/55 transition hover:border-[#12324a]/25 hover:text-[#12324a] focus-visible:cursor-grabbing focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35"
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
					{dish.name}
				</p>
				<div className="mt-2 flex flex-wrap items-center gap-2">
					<CatalogStatusBadge status={dish.status} />
					<a
						className="text-xs font-semibold text-[#236d7d] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e76832]/35"
						href={`/staff/catalog/dishes/${encodeURIComponent(dish.id)}`}
					>
						Administrar plato
					</a>
				</div>
			</div>
			<div className="flex shrink-0 gap-2">
				<Button
					aria-label={`Subir ${dish.name}`}
					disabled={isFirst}
					onClick={() => onMove(-1)}
					size="icon"
					variant="outline"
				>
					<ArrowUp aria-hidden="true" />
				</Button>
				<Button
					aria-label={`Bajar ${dish.name}`}
					disabled={isLast}
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

function getOrderErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		if (error.code === "FORBIDDEN")
			return "No tienes permisos para ordenar platos.";
		if (error.code === "DISH_NOT_FOUND")
			return "Uno de los platos ya no existe o no está disponible.";
		if (error.code === "NETWORK_ERROR" || error.status === 0)
			return "No se pudo conectar con el servidor. El orden se actualizó desde el servidor.";
	}
	return "No se pudo guardar todo el orden de los platos. Se mostró el orden confirmado por el servidor.";
}
