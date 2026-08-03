import { Plus, RefreshCw } from "lucide-react";
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
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { StaffSessionAccess } from "@/features/staff-auth/session/staff-session";
import { useStaffUnsavedChanges } from "@/features/staff-shell/components/StaffUnsavedChangesProvider";
import { ApiClientError } from "@/lib/api/api-error";
import type { MenuCategory } from "../contracts/staff-catalog.schemas";
import {
	type CatalogOrderItem,
	createCatalogOrderDraft,
	getChangedCatalogOrder,
	normalizeCatalogOrder,
} from "../lib/catalog-order";
import type { CatalogStatusFilter } from "../lib/catalog-status-filter";
import {
	hasCatalogDraftOrderConflict,
	readStaffCatalogDraft,
	removeStaffCatalogDraft,
	saveStaffCatalogDraft,
} from "../lib/staff-catalog-drafts";
import { useUpdateMenuCategoryOrderMutation } from "../query/staff-catalog-query";
import { CatalogListStatus } from "./CatalogListStatus";
import { CatalogSectionNav } from "./CatalogSectionNav";
import { CatalogStatusBadge } from "./CatalogStatusBadge";
import { CatalogStatusFilterNav } from "./CatalogStatusFilterNav";
import { SortableCategoryList } from "./SortableCategoryList";

const catalogOrderValuesSchema = z.array(z.uuid());
const catalogOrderBaseSchema = z.array(
	z.object({ id: z.uuid(), position: z.number().int().positive() }),
);

interface StaffCategoryListProps {
	categories: MenuCategory[];
	filter: CatalogStatusFilter;
	canCreate: boolean;
	canManage: boolean;
	session: StaffSessionAccess;
	userId: string;
	isLoading: boolean;
	isError: boolean;
	error: unknown;
	onRetry: () => void;
}

export function StaffCategoryList({
	categories,
	filter,
	canCreate,
	canManage,
	session,
	userId,
	isLoading,
	isError,
	error,
	onRetry,
}: StaffCategoryListProps) {
	const orderMutation = useUpdateMenuCategoryOrderMutation(session);
	const serverOrder = useMemo(
		() => createCatalogOrderDraft(categories),
		[categories],
	);
	const [baseOrder, setBaseOrder] = useState<CatalogOrderItem[]>(
		serverOrder.baseOrder,
	);
	const [orderedIds, setOrderedIds] = useState(serverOrder.orderedIds);
	const [draft, setDraft] = useState<{
		base: CatalogOrderItem[];
		values: string[];
	} | null>(null);
	const isOrderingEnabled = canManage && filter === "all";
	const isOrderDirty =
		isOrderingEnabled &&
		getChangedCatalogOrder(baseOrder, orderedIds).length > 0;
	const hasDraftConflict = draft
		? hasCatalogDraftOrderConflict(draft.base, serverOrder.baseOrder)
		: false;

	useStaffUnsavedChanges("category-order", isOrderDirty);

	useEffect(() => {
		if (isOrderDirty) return;

		setBaseOrder(serverOrder.baseOrder);
		setOrderedIds(serverOrder.orderedIds);
	}, [isOrderDirty, serverOrder]);

	useEffect(() => {
		if (!isOrderingEnabled) {
			setDraft(null);
			return;
		}

		const storedDraft = readStaffCatalogDraft({
			userId,
			section: "category-order",
			valuesSchema: catalogOrderValuesSchema,
			baseSchema: catalogOrderBaseSchema,
		});
		setDraft(storedDraft);
	}, [isOrderingEnabled, userId]);

	useEffect(() => {
		if (!isOrderDirty) return;

		saveStaffCatalogDraft({
			userId,
			section: "category-order",
			base: baseOrder,
			values: orderedIds,
			valuesSchema: catalogOrderValuesSchema,
			baseSchema: catalogOrderBaseSchema,
		});
	}, [baseOrder, isOrderDirty, orderedIds, userId]);

	function handleOrderChange(nextOrder: string[]): void {
		if (!isOrderDirty) setBaseOrder(serverOrder.baseOrder);
		setOrderedIds(nextOrder);
	}

	async function handleSaveOrder(): Promise<void> {
		try {
			await orderMutation.mutateAsync({
				baseOrder,
				categories,
				orderedIds,
			});
			const savedOrder = normalizeCatalogOrder(orderedIds);
			setBaseOrder(savedOrder);
			setOrderedIds(savedOrder.map((item) => item.id));
			removeStaffCatalogDraft(userId, "category-order");
			setDraft(null);
			toast.success("El orden de las categorías fue guardado.");
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
		removeStaffCatalogDraft(userId, "category-order");
		setDraft(null);
		setBaseOrder(serverOrder.baseOrder);
		setOrderedIds(serverOrder.orderedIds);
	}

	return (
		<div className="space-y-6">
			<CatalogSectionNav activeSection="categories" />

			<section className="flex flex-col gap-4 rounded-3xl border border-[#12324a]/10 bg-white/80 p-5 shadow-[0_20px_60px_rgba(18,50,74,0.06)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
				<div>
					<p className="text-sm text-[#12324a]/65">
						Organiza las categorías que agrupan la carta del restaurante.
					</p>
					<div className="mt-4">
						<CatalogStatusFilterNav
							basePath="/staff/catalog/categories"
							filter={filter}
							label="Filtrar categorías"
						/>
					</div>
				</div>
				{canCreate ? (
					<Button
						nativeButton={false}
						render={<a href="/staff/catalog/categories/new" />}
					>
						<Plus aria-hidden="true" />
						Nueva categoría
					</Button>
				) : null}
			</section>

			{isLoading ? (
				<CatalogListStatus busy message="Cargando categorías…" />
			) : null}
			{isError ? (
				<CatalogListStatus
					action={
						<Button onClick={onRetry} variant="outline">
							<RefreshCw aria-hidden="true" />
							Reintentar
						</Button>
					}
					message={getCategoryErrorMessage(error)}
				/>
			) : null}
			{!isLoading && !isError && categories.length === 0 ? (
				<EmptyCategoryState canCreate={canCreate} />
			) : null}
			{!isLoading && !isError && categories.length > 0 ? (
				isOrderingEnabled ? (
					<section className="space-y-5">
						<SortableCategoryList
							categories={categories}
							onOrderChange={handleOrderChange}
							orderedIds={orderedIds}
						/>
						<div className="flex flex-col gap-3 border-t border-[#12324a]/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-sm text-[#12324a]/65">
								{isOrderDirty
									? "Tienes cambios de orden pendientes de guardar."
									: "El orden actual está sincronizado con el servidor."}
							</p>
							<Button
								disabled={!isOrderDirty || orderMutation.isPending}
								onClick={() => void handleSaveOrder()}
							>
								{orderMutation.isPending ? "Guardando orden…" : "Guardar orden"}
							</Button>
						</div>
					</section>
				) : (
					<>
						<DesktopCategoryTable
							categories={categories}
							canManage={canManage}
						/>
						<MobileCategoryCards
							categories={categories}
							canManage={canManage}
						/>
					</>
				)
			) : null}

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
								? "Las categorías cambiaron en el servidor desde que guardaste este orden. ¿Quieres recuperar tu versión?"
								: "Hay un orden de categorías que no terminaste de guardar. Puedes recuperarlo o descartarlo."}
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
		</div>
	);
}

function DesktopCategoryTable({
	categories,
	canManage,
}: {
	categories: MenuCategory[];
	canManage: boolean;
}) {
	return (
		<div className="hidden overflow-hidden rounded-3xl border border-[#12324a]/10 bg-white/90 shadow-[0_20px_60px_rgba(18,50,74,0.06)] md:block">
			<Table className="border-collapse text-left">
				<TableCaption className="sr-only">
					Categorías del restaurante
				</TableCaption>
				<TableHeader className="bg-[#12324a] text-xs uppercase tracking-[0.16em] text-white/75">
					<TableRow className="border-0 hover:bg-transparent">
						<TableHead className="px-6 py-4 font-semibold text-white/75">
							Categoría
						</TableHead>
						<TableHead className="px-6 py-4 font-semibold text-white/75">
							Posición
						</TableHead>
						<TableHead className="px-6 py-4 font-semibold text-white/75">
							Estado
						</TableHead>
						<TableHead className="px-6 py-4 text-right font-semibold text-white/75">
							Acción
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="divide-y divide-[#12324a]/10">
					{categories.map((category) => (
						<TableRow key={category.id} className="align-top">
							<TableCell className="px-6 py-5 font-semibold whitespace-normal">
								{category.name}
							</TableCell>
							<TableCell className="px-6 py-5 text-sm text-[#12324a]/65">
								{category.position}
							</TableCell>
							<TableCell className="px-6 py-5">
								<CatalogStatusBadge status={category.status} />
							</TableCell>
							<TableCell className="px-6 py-5 text-right">
								<CategoryLink categoryId={category.id} canManage={canManage} />
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function MobileCategoryCards({
	categories,
	canManage,
}: {
	categories: MenuCategory[];
	canManage: boolean;
}) {
	return (
		<div className="grid gap-4 md:hidden">
			{categories.map((category) => (
				<article
					className="rounded-3xl border border-[#12324a]/10 bg-white/90 p-5 shadow-[0_20px_60px_rgba(18,50,74,0.06)]"
					key={category.id}
				>
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e76832]">
								Categoría
							</p>
							<h2 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.045em]">
								{category.name}
							</h2>
						</div>
						<CatalogStatusBadge status={category.status} />
					</div>
					<p className="mt-5 border-y border-[#12324a]/10 py-4 text-sm text-[#12324a]/65">
						<strong className="font-semibold text-[#12324a]">Posición:</strong>{" "}
						{category.position}
					</p>
					<CategoryLink categoryId={category.id} canManage={canManage} />
				</article>
			))}
		</div>
	);
}

function EmptyCategoryState({ canCreate }: { canCreate: boolean }) {
	return (
		<CatalogListStatus
			action={
				canCreate ? (
					<Button
						nativeButton={false}
						render={<a href="/staff/catalog/categories/new" />}
					>
						<Plus aria-hidden="true" />
						Crear primera categoría
					</Button>
				) : undefined
			}
			message={
				canCreate
					? "Todavía no hay categorías configuradas."
					: "No hay categorías disponibles para mostrar."
			}
		/>
	);
}

function CategoryLink({
	categoryId,
	canManage,
}: {
	categoryId: string;
	canManage: boolean;
}) {
	return (
		<a
			className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35 ${canManage ? "bg-[#12324a] text-white hover:bg-[#1d4b68]" : "border border-[#12324a]/15 text-[#12324a] hover:border-[#12324a]/30 hover:bg-white"}`}
			href={`/staff/catalog/categories/${encodeURIComponent(categoryId)}`}
		>
			{canManage ? "Administrar" : "Ver categoría"}
		</a>
	);
}

function getOrderErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		if (error.code === "FORBIDDEN") {
			return "No tienes permisos para reordenar las categorías.";
		}

		if (error.code === "NETWORK_ERROR" || error.status === 0) {
			return "No se pudo guardar el orden. Se recargará el orden del servidor.";
		}
	}

	return "No se pudo guardar todo el orden. Se recargará el orden del servidor.";
}

function getCategoryErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		if (error.code === "FORBIDDEN") {
			return "No tienes permisos para consultar las categorías.";
		}

		if (error.code === "RESTAURANT_NOT_FOUND") {
			return "El restaurante no existe o no está disponible.";
		}

		if (error.code === "NETWORK_ERROR" || error.status === 0) {
			return "No se pudo conectar con el servidor.";
		}
	}

	return "No se pudieron cargar las categorías.";
}
