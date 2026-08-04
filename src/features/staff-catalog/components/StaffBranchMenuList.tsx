import { RefreshCw, Settings } from "lucide-react";

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
import { ApiClientError } from "@/lib/api/api-error";
import type { StaffBranchDish } from "../contracts/staff-catalog.schemas";
import {
	type BranchDishFilter,
	filterBranchDishes,
} from "../lib/branch-dish-filter";
import { CatalogListStatus } from "./CatalogListStatus";
import { CatalogStatusBadge } from "./CatalogStatusBadge";

const FILTERS: Array<{ label: string; value: BranchDishFilter }> = [
	{ label: "Todos", value: "all" },
	{ label: "Disponibles", value: "available" },
	{ label: "Agotados", value: "sold_out" },
	{ label: "Inactivos", value: "inactive" },
	{ label: "Sin configurar", value: "unconfigured" },
];

interface StaffBranchMenuListProps {
	branchId: string;
	dishes: StaffBranchDish[];
	filter: BranchDishFilter;
	canConfigure: boolean;
	isLoading: boolean;
	isError: boolean;
	error: unknown;
	onFilterChange: (filter: BranchDishFilter) => void;
	onRetry: () => void;
}

export function StaffBranchMenuList({
	branchId,
	dishes,
	filter,
	canConfigure,
	isLoading,
	isError,
	error,
	onFilterChange,
	onRetry,
}: StaffBranchMenuListProps) {
	const filteredDishes = filterBranchDishes(dishes, filter);
	const groups = groupDishesByCategory(filteredDishes);

	return (
		<div className="space-y-6">
			<section className="rounded-3xl border border-[#12324a]/10 bg-white/80 p-5 shadow-[0_20px_60px_rgba(18,50,74,0.06)] sm:p-6">
				<div>
					<p className="text-sm text-[#12324a]/65">
						Configura precio y disponibilidad sin modificar el catálogo global.
					</p>
					<nav aria-label="Filtrar menú de sucursal" className="mt-4">
						<ul className="flex flex-wrap gap-2">
							{FILTERS.map((option) => (
								<li key={option.value}>
									<button
										aria-current={filter === option.value ? "page" : undefined}
										className={getFilterClassName(filter === option.value)}
										onClick={() => onFilterChange(option.value)}
										type="button"
									>
										{option.label}
									</button>
								</li>
							))}
						</ul>
					</nav>
				</div>
			</section>

			{isLoading ? <CatalogListStatus busy message="Cargando menú…" /> : null}
			{isError ? (
				<CatalogListStatus
					action={
						<Button onClick={onRetry} variant="outline">
							<RefreshCw aria-hidden="true" />
							Reintentar
						</Button>
					}
					message={getMenuErrorMessage(error)}
				/>
			) : null}
			{!isLoading && !isError && filteredDishes.length === 0 ? (
				<CatalogListStatus
					message={
						dishes.length === 0
							? "Todavía no hay platos globales para configurar."
							: "No hay platos que coincidan con este filtro."
					}
				/>
			) : null}
			{!isLoading && !isError && groups.length > 0 ? (
				<div className="space-y-6">
					{groups.map((group) => (
						<BranchDishGroup
							branchId={branchId}
							canConfigure={canConfigure}
							dishes={group.dishes}
							key={group.categoryId}
							name={group.categoryName}
						/>
					))}
				</div>
			) : null}
		</div>
	);
}

function BranchDishGroup({
	branchId,
	dishes,
	name,
	canConfigure,
}: {
	branchId: string;
	dishes: StaffBranchDish[];
	name: string;
	canConfigure: boolean;
}) {
	return (
		<section aria-labelledby={`branch-dish-group-${dishes[0]?.categoryId}`}>
			<div className="mb-3 flex items-end justify-between gap-4">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e76832]">
						Categoría
					</p>
					<h2
						className="mt-1 font-heading text-2xl font-semibold tracking-[-0.045em]"
						id={`branch-dish-group-${dishes[0]?.categoryId}`}
					>
						{name}
					</h2>
				</div>
				<p className="text-sm text-[#12324a]/55">
					{dishes.length} {dishes.length === 1 ? "plato" : "platos"}
				</p>
			</div>
			<div className="hidden overflow-hidden rounded-3xl border border-[#12324a]/10 bg-white/90 shadow-[0_20px_60px_rgba(18,50,74,0.06)] md:block">
				<BranchDishTable
					branchId={branchId}
					canConfigure={canConfigure}
					dishes={dishes}
				/>
			</div>
			<div className="grid gap-4 md:hidden">
				{dishes.map((dish) => (
					<BranchDishCard
						branchId={branchId}
						canConfigure={canConfigure}
						dish={dish}
						key={dish.id}
					/>
				))}
			</div>
		</section>
	);
}

function BranchDishTable({
	branchId,
	dishes,
	canConfigure,
}: {
	branchId: string;
	dishes: StaffBranchDish[];
	canConfigure: boolean;
}) {
	return (
		<Table>
			<TableCaption className="sr-only">
				Configuración de platos de {dishes[0]?.categoryName}
			</TableCaption>
			<TableHeader className="bg-[#12324a] text-xs uppercase tracking-[0.16em] text-white/75">
				<TableRow className="border-0 hover:bg-transparent">
					<TableHead className="px-6 py-4 font-semibold text-white/75">
						Plato
					</TableHead>
					<TableHead className="px-6 py-4 font-semibold text-white/75">
						Estado global
					</TableHead>
					<TableHead className="px-6 py-4 font-semibold text-white/75">
						Configuración
					</TableHead>
					<TableHead className="px-6 py-4 text-right font-semibold text-white/75">
						Acción
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody className="divide-y divide-[#12324a]/10">
				{dishes.map((dish) => (
					<TableRow className="align-top" key={dish.id}>
						<TableCell className="px-6 py-5 whitespace-normal">
							<p className="font-semibold">{dish.name}</p>
							<p className="mt-1 text-sm text-[#12324a]/55">
								Posición {dish.position}
							</p>
						</TableCell>
						<TableCell className="px-6 py-5">
							<GlobalState dish={dish} />
						</TableCell>
						<TableCell className="px-6 py-5">
							<ConfigurationSummary dish={dish} />
						</TableCell>
						<TableCell className="px-6 py-5 text-right">
							<ConfigureLink
								branchId={branchId}
								canConfigure={canConfigure}
								dishId={dish.id}
							/>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function BranchDishCard({
	branchId,
	dish,
	canConfigure,
}: {
	branchId: string;
	dish: StaffBranchDish;
	canConfigure: boolean;
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
			<div className="mt-5 space-y-3 border-y border-[#12324a]/10 py-4">
				<GlobalState dish={dish} />
				<ConfigurationSummary dish={dish} />
			</div>
			<ConfigureLink
				branchId={branchId}
				canConfigure={canConfigure}
				dishId={dish.id}
			/>
		</article>
	);
}

function GlobalState({ dish }: { dish: StaffBranchDish }) {
	return (
		<div className="text-sm text-[#12324a]/65">
			<span className="font-semibold text-[#12324a]">Estado global:</span>{" "}
			{dish.status === "active" ? "Activo" : "Inactivo"}
			{dish.status === "inactive" || dish.categoryName.length === 0
				? null
				: null}
		</div>
	);
}

function ConfigurationSummary({ dish }: { dish: StaffBranchDish }) {
	if (!dish.branchConfiguration) {
		return (
			<p className="text-sm font-semibold text-[#e76832]">Sin configurar</p>
		);
	}

	const status = getBranchStatusLabel(dish.branchConfiguration.status);
	return (
		<p className="text-sm text-[#12324a]/70">
			<span className="font-semibold text-[#12324a]">
				{formatPrice(dish.branchConfiguration.price)}
			</span>{" "}
			· {status}
		</p>
	);
}

function ConfigureLink({
	branchId,
	dishId,
	canConfigure,
}: {
	branchId: string;
	dishId: string;
	canConfigure: boolean;
}) {
	return (
		<Button
			nativeButton={false}
			render={
				<a
					href={`/staff/branches/${encodeURIComponent(branchId)}/menu?dish=${encodeURIComponent(dishId)}`}
				/>
			}
			variant={canConfigure ? "default" : "outline"}
		>
			<Settings aria-hidden="true" />
			{canConfigure ? "Configurar" : "Ver configuración"}
		</Button>
	);
}

function groupDishesByCategory(dishes: StaffBranchDish[]) {
	const groups = new Map<
		string,
		{ categoryId: string; categoryName: string; dishes: StaffBranchDish[] }
	>();
	for (const dish of dishes) {
		const group = groups.get(dish.categoryId);
		if (group) group.dishes.push(dish);
		else
			groups.set(dish.categoryId, {
				categoryId: dish.categoryId,
				categoryName: dish.categoryName,
				dishes: [dish],
			});
	}
	return [...groups.values()];
}

function getFilterClassName(selected: boolean): string {
	return `inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35 ${selected ? "bg-[#12324a] text-white" : "border border-[#12324a]/15 bg-white text-[#12324a]/70 hover:border-[#12324a]/30"}`;
}

function formatPrice(price: string): string {
	return new Intl.NumberFormat("es-PE", {
		currency: "PEN",
		style: "currency",
	}).format(Number(price));
}

function getBranchStatusLabel(
	status: NonNullable<StaffBranchDish["branchConfiguration"]>["status"],
): string {
	return status === "available"
		? "Disponible"
		: status === "sold_out"
			? "Agotado"
			: "Inactivo";
}

function getMenuErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		if (error.code === "FORBIDDEN")
			return "No tienes permisos para consultar el menú de esta sucursal.";
		if (error.code === "BRANCH_NOT_FOUND")
			return "La sucursal no existe o no está disponible.";
		if (error.code === "RESTAURANT_NOT_FOUND")
			return "El restaurante no existe o no está disponible.";
		if (error.code === "NETWORK_ERROR" || error.status === 0)
			return "No se pudo conectar con el servidor.";
	}
	return "No se pudo cargar el menú de la sucursal.";
}
