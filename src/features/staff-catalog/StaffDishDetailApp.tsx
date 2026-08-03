import { useEffect } from "react";
import { toast } from "sonner";

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
import { CatalogStatusBadge } from "./components/CatalogStatusBadge";
import { StaffDishDetailsForm } from "./components/StaffDishDetailsForm";
import { StaffDishStatusControl } from "./components/StaffDishStatusControl";
import { canManageStaffCatalog } from "./lib/staff-catalog-permissions";
import {
	useStaffCategoriesQuery,
	useStaffDishQuery,
} from "./query/staff-catalog-query";

interface StaffDishDetailAppProps {
	dishId: string;
}

export function StaffDishDetailApp({ dishId }: StaffDishDetailAppProps) {
	return (
		<StaffQueryProvider>
			<StaffAuthProvider>
				<StaffDishDetailScreen dishId={dishId} />
			</StaffAuthProvider>
		</StaffQueryProvider>
	);
}

function StaffDishDetailScreen({ dishId }: StaffDishDetailAppProps) {
	const { session, snapshot } = useStaffAuth();
	const dishQuery = useStaffDishQuery(session, dishId);
	const categoriesQuery = useStaffCategoriesQuery(session);

	useEffect(() => {
		const url = new URL(window.location.href);
		if (url.searchParams.get("created") !== "1") return;

		toast.success("El plato fue creado correctamente.");
		url.searchParams.delete("created");
		window.history.replaceState(
			{},
			"",
			`${url.pathname}${url.search}${url.hash}`,
		);
	}, []);

	return (
		<StaffUnsavedChangesProvider>
			<StaffLayout eyebrow="Gestión del catálogo" title="Administrar plato">
				{snapshot.status === "checking" ? (
					<CatalogListStatus busy message="Comprobando tu sesión…" />
				) : (
					<ProtectedStaffRoute>
						{dishQuery.isPending || categoriesQuery.isPending ? (
							<CatalogListStatus busy message="Cargando el plato…" />
						) : null}
						{dishQuery.isError ? (
							<DetailError
								error={dishQuery.error}
								onRetry={() => void dishQuery.refetch()}
							/>
						) : null}
						{categoriesQuery.isError ? (
							<DetailError
								error={categoriesQuery.error}
								onRetry={() => void categoriesQuery.refetch()}
							/>
						) : null}
						{dishQuery.data && categoriesQuery.data && snapshot.user ? (
							<DishOverview
								canManage={canManageStaffCatalog(snapshot.user.role)}
								categories={categoriesQuery.data}
								dish={dishQuery.data}
								session={session}
								userId={snapshot.user.id}
							/>
						) : null}
					</ProtectedStaffRoute>
				)}
			</StaffLayout>
		</StaffUnsavedChangesProvider>
	);
}

function DishOverview({
	dish,
	categories,
	session,
	userId,
	canManage,
}: {
	dish: Awaited<ReturnType<typeof useStaffDishQuery>>["data"];
	categories: Awaited<ReturnType<typeof useStaffCategoriesQuery>>["data"];
	session: Parameters<typeof StaffDishDetailsForm>[0]["session"];
	userId: string;
	canManage: boolean;
}) {
	if (!dish || !categories) return null;

	return (
		<div className="space-y-6">
			<section className="rounded-3xl border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.08)] sm:p-8">
				<div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e76832]">
							Plato del catálogo
						</p>
						<h2 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.06em]">
							{dish.name}
						</h2>
						<p className="mt-2 text-sm text-[#12324a]/55">
							{dish.categoryName} · Posición {dish.position}
						</p>
					</div>
					<CatalogStatusBadge status={dish.status} />
				</div>

				<p className="mt-8 max-w-3xl border-t border-[#12324a]/10 pt-6 text-sm leading-7 text-[#12324a]/70">
					{dish.description}
				</p>
				<div className="mt-6 grid gap-4 sm:grid-cols-2">
					<InfoCard label="Ingredientes" value={formatList(dish.ingredients)} />
					<InfoCard label="Alérgenos" value={formatList(dish.allergens)} />
				</div>
			</section>

			{canManage ? (
				<>
					<StaffDishDetailsForm
						categories={categories}
						dish={dish}
						session={session}
						userId={userId}
					/>
					<StaffDishStatusControl dish={dish} session={session} />
				</>
			) : (
				<ReadOnlyNotice />
			)}
		</div>
	);
}

function InfoCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-2xl border border-[#12324a]/10 bg-[#f4f0e8]/55 p-4">
			<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#12324a]/45">
				{label}
			</p>
			<p className="mt-2 text-sm leading-6">{value || "Ninguno registrado"}</p>
		</div>
	);
}

function ReadOnlyNotice() {
	return (
		<section className="rounded-2xl border border-[#12324a]/10 bg-[#f4f0e8]/55 p-5">
			<p className="text-sm leading-6 text-[#12324a]/65">
				Tu rol puede consultar el catálogo global, pero no modificar sus platos.
			</p>
		</section>
	);
}

function formatList(values: string[]): string {
	return values.join(", ");
}

function DetailError({
	error,
	onRetry,
}: {
	error: unknown;
	onRetry: () => void;
}) {
	const isNotFound =
		error instanceof ApiClientError && error.code === "DISH_NOT_FOUND";
	const isForbidden =
		error instanceof ApiClientError && error.code === "FORBIDDEN";
	const message = isNotFound
		? "El plato no existe o no está disponible."
		: isForbidden
			? "No tienes permisos para consultar este plato."
			: error instanceof ApiClientError &&
					(error.code === "NETWORK_ERROR" || error.status === 0)
				? "No se pudo conectar con el servidor."
				: "No se pudo cargar el plato.";

	return (
		<section
			className="grid min-h-56 place-items-center rounded-3xl border border-[#12324a]/10 bg-white/80 p-8 text-center"
			role="alert"
		>
			<div className="space-y-4">
				<p className="text-sm text-[#12324a]/70">{message}</p>
				<div className="flex flex-wrap justify-center gap-3">
					{!isNotFound && !isForbidden ? (
						<Button onClick={onRetry} variant="outline">
							Reintentar
						</Button>
					) : null}
					<Button render={<a href="/staff/catalog/dishes" />}>
						Volver a platos
					</Button>
				</div>
			</div>
		</section>
	);
}
