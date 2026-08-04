import { Button } from "@/components/ui/button";
import { ProtectedStaffRoute } from "@/features/staff-auth/components/ProtectedStaffRoute";
import {
	StaffAuthProvider,
	useStaffAuth,
} from "@/features/staff-auth/components/StaffAuthProvider";
import { StaffQueryProvider } from "@/features/staff-auth/query/staff-query-client";
import { StaffLayout } from "@/features/staff-shell/components/StaffLayout";
import { StaffUnsavedChangesProvider } from "@/features/staff-shell/components/StaffUnsavedChangesProvider";
import { ApiClientError } from "@/lib/api/api-error";
import { CatalogListStatus } from "./components/CatalogListStatus";
import { StaffDishCreateForm } from "./components/StaffDishCreateForm";
import { getNextCatalogPosition } from "./lib/catalog-order";
import { canCreateStaffCatalog } from "./lib/staff-catalog-permissions";
import {
	useStaffCategoriesQuery,
	useStaffDishesQuery,
} from "./query/staff-catalog-query";

export function StaffDishCreateApp() {
	return (
		<StaffQueryProvider>
			<StaffAuthProvider>
				<StaffDishCreateScreen />
			</StaffAuthProvider>
		</StaffQueryProvider>
	);
}

function StaffDishCreateScreen() {
	const { session, snapshot } = useStaffAuth();
	const categoriesQuery = useStaffCategoriesQuery(session);
	const dishesQuery = useStaffDishesQuery(session);
	const canCreate = snapshot.user
		? canCreateStaffCatalog(snapshot.user.role)
		: false;
	const categories = categoriesQuery.data ?? [];
	const initialCategoryId = categories[0]?.id;
	const positionsByCategory = Object.fromEntries(
		categories.map((category) => [
			category.id,
			getNextCatalogPosition(
				(dishesQuery.data ?? []).filter(
					(dish) => dish.categoryId === category.id,
				),
			),
		]),
	);
	const initialPosition = initialCategoryId
		? (positionsByCategory[initialCategoryId] ?? 1)
		: 1;

	return (
		<StaffUnsavedChangesProvider>
			<StaffLayout eyebrow="Gestión del catálogo" title="Nuevo plato">
				{snapshot.status === "checking" ? (
					<CatalogListStatus busy message="Comprobando tu sesión…" />
				) : (
					<ProtectedStaffRoute>
						{categoriesQuery.isPending || dishesQuery.isPending ? (
							<CatalogListStatus busy message="Cargando datos del catálogo…" />
						) : null}
						{categoriesQuery.isError || dishesQuery.isError ? (
							<CreateError error={categoriesQuery.error ?? dishesQuery.error} />
						) : null}
						{!categoriesQuery.isError &&
						!dishesQuery.isError &&
						categories.length === 0 ? (
							<NoCategories />
						) : null}
						{!categoriesQuery.isError &&
						!dishesQuery.isError &&
						categories.length > 0 &&
						snapshot.user &&
						canCreate ? (
							<section className="max-w-4xl rounded-3xl border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.08)] sm:p-8">
								<StaffDishCreateForm
									categories={categories}
									initialPosition={initialPosition}
									positionsByCategory={positionsByCategory}
									session={session}
									userId={snapshot.user.id}
								/>
							</section>
						) : null}
						{!categoriesQuery.isError &&
						!dishesQuery.isError &&
						categories.length > 0 &&
						snapshot.user &&
						!canCreate ? (
							<NoCreatePermission />
						) : null}
					</ProtectedStaffRoute>
				)}
			</StaffLayout>
		</StaffUnsavedChangesProvider>
	);
}

function CreateError({ error }: { error: unknown }) {
	const message =
		error instanceof ApiClientError && error.code === "FORBIDDEN"
			? "No tienes permisos para consultar el catálogo."
			: error instanceof ApiClientError && error.code === "RESTAURANT_NOT_FOUND"
				? "El restaurante no existe o no está disponible."
				: "No se pudo cargar el catálogo.";

	return (
		<section
			className="grid min-h-56 place-items-center rounded-3xl border border-[#12324a]/10 bg-white/80 p-8 text-center"
			role="alert"
		>
			<div className="space-y-4">
				<p className="text-sm text-[#12324a]/70">{message}</p>
				<Button render={<a href="/staff/catalog/dishes" />}>
					Volver a platos
				</Button>
			</div>
		</section>
	);
}

function NoCategories() {
	return (
		<section className="max-w-2xl rounded-3xl border border-[#12324a]/10 bg-white/90 p-8 shadow-[0_20px_60px_rgba(18,50,74,0.08)]">
			<h2 className="font-heading text-3xl font-semibold tracking-[-0.05em]">
				Crea una categoría primero
			</h2>
			<p className="mt-3 text-sm leading-6 text-[#12324a]/65">
				Un plato necesita pertenecer a una categoría del catálogo.
			</p>
			<Button
				className="mt-6"
				render={<a href="/staff/catalog/categories/new" />}
			>
				Crear categoría
			</Button>
		</section>
	);
}

function NoCreatePermission() {
	return (
		<section className="max-w-2xl rounded-3xl border border-[#12324a]/10 bg-white/90 p-8 shadow-[0_20px_60px_rgba(18,50,74,0.08)]">
			<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e76832]">
				Acceso restringido
			</p>
			<h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.05em]">
				No puedes crear platos
			</h2>
			<p className="mt-3 text-sm leading-6 text-[#12324a]/65">
				Tu rol puede consultar el catálogo global, pero no modificar sus platos.
			</p>
			<Button className="mt-6" render={<a href="/staff/catalog/dishes" />}>
				Volver a platos
			</Button>
		</section>
	);
}
