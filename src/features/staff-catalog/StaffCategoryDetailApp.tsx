import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ProtectedStaffRoute } from "@/features/staff-auth/components/ProtectedStaffRoute";
import {
	StaffAuthProvider,
	useStaffAuth,
} from "@/features/staff-auth/components/StaffAuthProvider";
import { StaffQueryProvider } from "@/features/staff-auth/query/staff-query-client";
import type { StaffSessionAccess } from "@/features/staff-auth/session/staff-session";
import { StaffLayout } from "@/features/staff-shell/components/StaffLayout";
import { StaffUnsavedChangesProvider } from "@/features/staff-shell/components/StaffUnsavedChangesProvider";
import { ApiClientError } from "@/lib/api/api-error";
import { CatalogListStatus } from "./components/CatalogListStatus";
import { CatalogStatusBadge } from "./components/CatalogStatusBadge";
import { StaffCategoryDetailsForm } from "./components/StaffCategoryDetailsForm";
import { StaffCategoryStatusControl } from "./components/StaffCategoryStatusControl";
import type { MenuCategory } from "./contracts/staff-catalog.schemas";
import { canManageStaffCatalog } from "./lib/staff-catalog-permissions";
import { useStaffCategoryQuery } from "./query/staff-catalog-query";

interface StaffCategoryDetailAppProps {
	categoryId: string;
}

export function StaffCategoryDetailApp({
	categoryId,
}: StaffCategoryDetailAppProps) {
	return (
		<StaffQueryProvider>
			<StaffAuthProvider>
				<StaffCategoryDetailScreen categoryId={categoryId} />
			</StaffAuthProvider>
		</StaffQueryProvider>
	);
}

function StaffCategoryDetailScreen({
	categoryId,
}: StaffCategoryDetailAppProps) {
	const { session, snapshot } = useStaffAuth();
	const categoryQuery = useStaffCategoryQuery(session, categoryId);

	useEffect(() => {
		const url = new URL(window.location.href);
		if (url.searchParams.get("created") !== "1") return;

		toast.success("La categoría fue creada correctamente.");
		url.searchParams.delete("created");
		window.history.replaceState(
			{},
			"",
			`${url.pathname}${url.search}${url.hash}`,
		);
	}, []);

	return (
		<StaffUnsavedChangesProvider>
			<StaffLayout eyebrow="Gestión del catálogo" title="Administrar categoría">
				{snapshot.status === "checking" ? (
					<CatalogListStatus busy message="Comprobando tu sesión…" />
				) : (
					<ProtectedStaffRoute>
						{categoryQuery.isPending ? (
							<CatalogListStatus busy message="Cargando la categoría…" />
						) : null}
						{categoryQuery.isError ? (
							<DetailError
								error={categoryQuery.error}
								onRetry={() => void categoryQuery.refetch()}
							/>
						) : null}
						{categoryQuery.data && snapshot.user ? (
							<CategoryOverview
								category={categoryQuery.data}
								session={session}
								userId={snapshot.user.id}
								canManage={canManageStaffCatalog(snapshot.user.role)}
							/>
						) : null}
					</ProtectedStaffRoute>
				)}
			</StaffLayout>
		</StaffUnsavedChangesProvider>
	);
}

function CategoryOverview({
	category,
	session,
	userId,
	canManage,
}: {
	category: MenuCategory;
	session: StaffSessionAccess;
	userId: string;
	canManage: boolean;
}) {
	return (
		<div className="space-y-6">
			<section className="rounded-3xl border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.08)] sm:p-8">
				<div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e76832]">
							Categoría del catálogo
						</p>
						<h2 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.06em]">
							{category.name}
						</h2>
						<p className="mt-2 text-sm text-[#12324a]/55">
							Posición {category.position}
						</p>
					</div>
					<CatalogStatusBadge status={category.status} />
				</div>

				<div className="mt-8 grid gap-4 border-t border-[#12324a]/10 pt-6 sm:grid-cols-3">
					<InfoCard label="Nombre" value={category.name} />
					<InfoCard label="Posición" value={String(category.position)} />
					<InfoCard
						label="Estado"
						value={category.status === "active" ? "Activa" : "Inactiva"}
					/>
				</div>
			</section>

			{canManage ? (
				<>
					<StaffCategoryDetailsForm
						category={category}
						session={session}
						userId={userId}
					/>
					<StaffCategoryStatusControl category={category} session={session} />
				</>
			) : (
				<ReadOnlyNotice />
			)}
		</div>
	);
}

function ReadOnlyNotice() {
	return (
		<section className="rounded-2xl border border-[#12324a]/10 bg-[#f4f0e8]/55 p-5">
			<p className="text-sm leading-6 text-[#12324a]/65">
				Tu rol puede consultar el catálogo global, pero no modificar sus
				categorías.
			</p>
		</section>
	);
}

function InfoCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-2xl border border-[#12324a]/10 bg-[#f4f0e8]/55 p-4">
			<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#12324a]/45">
				{label}
			</p>
			<p className="mt-2 text-sm font-semibold">{value}</p>
		</div>
	);
}

function DetailError({
	error,
	onRetry,
}: {
	error: unknown;
	onRetry: () => void;
}) {
	const isNotFound =
		error instanceof ApiClientError && error.code === "MENU_CATEGORY_NOT_FOUND";
	const isForbidden =
		error instanceof ApiClientError && error.code === "FORBIDDEN";
	const message = isNotFound
		? "La categoría no existe o no está disponible."
		: isForbidden
			? "No tienes permisos para consultar esta categoría."
			: error instanceof ApiClientError &&
					(error.code === "NETWORK_ERROR" || error.status === 0)
				? "No se pudo conectar con el servidor."
				: "No se pudo cargar la categoría.";

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
					<Button render={<a href="/staff/catalog/categories" />}>
						Volver a categorías
					</Button>
				</div>
			</div>
		</section>
	);
}
