import { Plus, RefreshCw } from "lucide-react";

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
import { ApiClientError } from "@/lib/api/api-error";
import type { StaffDish } from "../contracts/staff-catalog.schemas";
import type { CatalogStatusFilter } from "../lib/catalog-status-filter";
import { CatalogListStatus } from "./CatalogListStatus";
import { CatalogSectionNav } from "./CatalogSectionNav";
import { CatalogStatusBadge } from "./CatalogStatusBadge";
import { CatalogStatusFilterNav } from "./CatalogStatusFilterNav";
import { SortableDishList } from "./SortableDishList";

interface StaffDishListProps {
	dishes: StaffDish[];
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

export function StaffDishList({
	dishes,
	filter,
	canCreate,
	canManage,
	session,
	userId,
	isLoading,
	isError,
	error,
	onRetry,
}: StaffDishListProps) {
	const groups = groupDishesByCategory(dishes);

	return (
		<div className="space-y-6">
			<CatalogSectionNav activeSection="dishes" />

			<section className="flex flex-col gap-4 rounded-3xl border border-[#12324a]/10 bg-white/80 p-5 shadow-[0_20px_60px_rgba(18,50,74,0.06)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
				<div>
					<p className="text-sm text-[#12324a]/65">
						Mantén la carta global organizada por categorías.
					</p>
					<div className="mt-4">
						<CatalogStatusFilterNav
							basePath="/staff/catalog/dishes"
							filter={filter}
							label="Filtrar platos"
						/>
					</div>
				</div>
				{canCreate ? (
					<Button
						nativeButton={false}
						render={<a href="/staff/catalog/dishes/new" />}
					>
						<Plus aria-hidden="true" />
						Nuevo plato
					</Button>
				) : null}
			</section>

			{isLoading ? <CatalogListStatus busy message="Cargando platos…" /> : null}
			{isError ? (
				<CatalogListStatus
					action={
						<Button onClick={onRetry} variant="outline">
							<RefreshCw aria-hidden="true" />
							Reintentar
						</Button>
					}
					message={getDishErrorMessage(error)}
				/>
			) : null}
			{!isLoading && !isError && groups.length === 0 ? (
				<EmptyDishState canCreate={canCreate} />
			) : null}
			{!isLoading && !isError && groups.length > 0 ? (
				<div className="space-y-6">
					{groups.map((group) => (
						<CategoryDishGroup
							canManage={canManage}
							canOrder={canManage && filter === "all"}
							dishes={group.dishes}
							key={group.categoryId}
							name={group.categoryName}
							session={session}
							userId={userId}
						/>
					))}
				</div>
			) : null}
		</div>
	);
}

interface DishGroup {
	categoryId: string;
	categoryName: string;
	dishes: StaffDish[];
}

function groupDishesByCategory(dishes: StaffDish[]): DishGroup[] {
	const groups = new Map<string, DishGroup>();

	for (const dish of dishes) {
		const existingGroup = groups.get(dish.categoryId);
		if (existingGroup) {
			existingGroup.dishes.push(dish);
			continue;
		}

		groups.set(dish.categoryId, {
			categoryId: dish.categoryId,
			categoryName: dish.categoryName,
			dishes: [dish],
		});
	}

	return [...groups.values()];
}

function CategoryDishGroup({
	name,
	dishes,
	canManage,
	canOrder,
	session,
	userId,
}: {
	name: string;
	dishes: StaffDish[];
	canManage: boolean;
	canOrder: boolean;
	session: StaffSessionAccess;
	userId: string;
}) {
	return (
		<section aria-labelledby={`dish-group-${dishes[0]?.categoryId}`}>
			<div className="mb-3 flex items-end justify-between gap-4">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e76832]">
						Categoría
					</p>
					<h2
						className="mt-1 font-heading text-2xl font-semibold tracking-[-0.045em]"
						id={`dish-group-${dishes[0]?.categoryId}`}
					>
						{name}
					</h2>
				</div>
				<p className="text-sm text-[#12324a]/55">
					{dishes.length} {dishes.length === 1 ? "plato" : "platos"}
				</p>
			</div>
			{canOrder ? (
				<SortableDishList dishes={dishes} session={session} userId={userId} />
			) : (
				<>
					<div className="hidden overflow-hidden rounded-3xl border border-[#12324a]/10 bg-white/90 shadow-[0_20px_60px_rgba(18,50,74,0.06)] md:block">
						<DishTable canManage={canManage} dishes={dishes} />
					</div>
					<div className="grid gap-4 md:hidden">
						{dishes.map((dish) => (
							<DishCard canManage={canManage} dish={dish} key={dish.id} />
						))}
					</div>
				</>
			)}
		</section>
	);
}

function DishTable({
	dishes,
	canManage,
}: {
	dishes: StaffDish[];
	canManage: boolean;
}) {
	return (
		<Table className="border-collapse text-left">
			<TableCaption className="sr-only">
				Platos de la categoría {dishes[0]?.categoryName}
			</TableCaption>
			<TableHeader className="bg-[#12324a] text-xs uppercase tracking-[0.16em] text-white/75">
				<TableRow className="border-0 hover:bg-transparent">
					<TableHead className="px-6 py-4 font-semibold text-white/75">
						Plato
					</TableHead>
					<TableHead className="px-6 py-4 font-semibold text-white/75">
						Descripción
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
				{dishes.map((dish) => (
					<TableRow className="align-top" key={dish.id}>
						<TableCell className="px-6 py-5 font-semibold whitespace-normal">
							{dish.name}
						</TableCell>
						<TableCell className="max-w-72 px-6 py-5 text-sm leading-6 text-[#12324a]/65 whitespace-normal">
							{dish.description}
						</TableCell>
						<TableCell className="px-6 py-5 text-sm text-[#12324a]/65">
							{dish.position}
						</TableCell>
						<TableCell className="px-6 py-5">
							<CatalogStatusBadge status={dish.status} />
						</TableCell>
						<TableCell className="px-6 py-5 text-right">
							<DishLink canManage={canManage} dishId={dish.id} />
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function DishCard({
	dish,
	canManage,
}: {
	dish: StaffDish;
	canManage: boolean;
}) {
	return (
		<article className="rounded-3xl border border-[#12324a]/10 bg-white/90 p-5 shadow-[0_20px_60px_rgba(18,50,74,0.06)]">
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e76832]">
						Posición {dish.position}
					</p>
					<h3 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.045em]">
						{dish.name}
					</h3>
				</div>
				<CatalogStatusBadge status={dish.status} />
			</div>
			<p className="mt-5 border-y border-[#12324a]/10 py-4 text-sm leading-6 text-[#12324a]/65">
				{dish.description}
			</p>
			<DishLink canManage={canManage} dishId={dish.id} />
		</article>
	);
}

function EmptyDishState({ canCreate }: { canCreate: boolean }) {
	return (
		<CatalogListStatus
			action={
				canCreate ? (
					<Button
						nativeButton={false}
						render={<a href="/staff/catalog/dishes/new" />}
					>
						<Plus aria-hidden="true" />
						Crear primer plato
					</Button>
				) : undefined
			}
			message={
				canCreate
					? "Todavía no hay platos configurados."
					: "No hay platos disponibles para mostrar."
			}
		/>
	);
}

function DishLink({
	dishId,
	canManage,
}: {
	dishId: string;
	canManage: boolean;
}) {
	return (
		<a
			className={`mt-4 inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35 ${canManage ? "bg-[#12324a] text-white hover:bg-[#1d4b68]" : "border border-[#12324a]/15 text-[#12324a] hover:border-[#12324a]/30 hover:bg-white"}`}
			href={`/staff/catalog/dishes/${encodeURIComponent(dishId)}`}
		>
			{canManage ? "Administrar" : "Ver plato"}
		</a>
	);
}

function getDishErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		if (error.code === "FORBIDDEN") {
			return "No tienes permisos para consultar los platos.";
		}

		if (error.code === "RESTAURANT_NOT_FOUND") {
			return "El restaurante no existe o no está disponible.";
		}

		if (error.code === "NETWORK_ERROR" || error.status === 0) {
			return "No se pudo conectar con el servidor.";
		}
	}

	return "No se pudieron cargar los platos.";
}
