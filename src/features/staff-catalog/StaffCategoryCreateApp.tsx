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
import { StaffCategoryCreateForm } from "./components/StaffCategoryCreateForm";
import { getNextCatalogPosition } from "./lib/catalog-order";
import { canCreateStaffCatalog } from "./lib/staff-catalog-permissions";
import { useStaffCategoriesQuery } from "./query/staff-catalog-query";

export function StaffCategoryCreateApp() {
	return (
		<StaffQueryProvider>
			<StaffAuthProvider>
				<StaffCategoryCreateScreen />
			</StaffAuthProvider>
		</StaffQueryProvider>
	);
}

function StaffCategoryCreateScreen() {
	const { session, snapshot } = useStaffAuth();
	const canCreate = snapshot.user
		? canCreateStaffCatalog(snapshot.user.role)
		: false;
	const categoriesQuery = useStaffCategoriesQuery(session);

	return (
		<StaffUnsavedChangesProvider>
			<ProtectedStaffRoute>
				<StaffLayout eyebrow="Gestión del catálogo" title="Nueva categoría">
					{snapshot.status === "checking" || categoriesQuery.isPending ? (
						<CatalogListStatus busy message="Cargando el catálogo…" />
					) : null}
					{categoriesQuery.isError ? (
						<CreateError error={categoriesQuery.error} />
					) : null}
					{categoriesQuery.data && snapshot.user && canCreate ? (
						<section className="max-w-3xl rounded-3xl border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.08)] sm:p-8">
							<div className="mb-8 space-y-3">
								<p className="text-sm leading-6 text-[#12324a]/65">
									La categoría se creará inactiva. Podrás activarla después de
									completar su configuración.
								</p>
							</div>
							<StaffCategoryCreateForm
								initialPosition={getNextCatalogPosition(categoriesQuery.data)}
								session={session}
								userId={snapshot.user.id}
							/>
						</section>
					) : null}
					{categoriesQuery.data && snapshot.user && !canCreate ? (
						<NoCreatePermission />
					) : null}
				</StaffLayout>
			</ProtectedStaffRoute>
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
				<Button render={<a href="/staff/catalog/categories" />}>
					Volver a categorías
				</Button>
			</div>
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
				No puedes crear categorías
			</h2>
			<p className="mt-3 text-sm leading-6 text-[#12324a]/65">
				Tu rol solo permite consultar el catálogo y configurar platos en tu
				sucursal asignada.
			</p>
			<Button className="mt-6" render={<a href="/staff/catalog/categories" />}>
				Volver a categorías
			</Button>
		</section>
	);
}
