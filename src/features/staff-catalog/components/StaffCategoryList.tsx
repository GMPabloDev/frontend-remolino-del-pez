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
import { ApiClientError } from "@/lib/api/api-error";
import type { MenuCategory } from "../contracts/staff-catalog.schemas";
import type { CatalogStatusFilter } from "../lib/catalog-status-filter";
import { CatalogListStatus } from "./CatalogListStatus";
import { CatalogSectionNav } from "./CatalogSectionNav";
import { CatalogStatusBadge } from "./CatalogStatusBadge";
import { CatalogStatusFilterNav } from "./CatalogStatusFilterNav";

interface StaffCategoryListProps {
	categories: MenuCategory[];
	filter: CatalogStatusFilter;
	canCreate: boolean;
	canManage: boolean;
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
	isLoading,
	isError,
	error,
	onRetry,
}: StaffCategoryListProps) {
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
				<>
					<DesktopCategoryTable categories={categories} canManage={canManage} />
					<MobileCategoryCards categories={categories} canManage={canManage} />
				</>
			) : null}
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
