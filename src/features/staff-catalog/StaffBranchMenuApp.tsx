import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ProtectedStaffRoute } from "@/features/staff-auth/components/ProtectedStaffRoute";
import {
	StaffAuthProvider,
	useStaffAuth,
} from "@/features/staff-auth/components/StaffAuthProvider";
import { StaffQueryProvider } from "@/features/staff-auth/query/staff-query-client";
import { useStaffBranchQuery } from "@/features/staff-branches/query/staff-branches-query";
import { StaffLayout } from "@/features/staff-shell/components/StaffLayout";
import { StaffUnsavedChangesProvider } from "@/features/staff-shell/components/StaffUnsavedChangesProvider";
import { ApiClientError } from "@/lib/api/api-error";
import { CatalogListStatus } from "./components/CatalogListStatus";
import { StaffBranchDishConfigurationForm } from "./components/StaffBranchDishConfigurationForm";
import { StaffBranchMenuList } from "./components/StaffBranchMenuList";
import type { BranchDishFilter } from "./lib/branch-dish-filter";
import { canConfigureBranchMenu } from "./lib/staff-catalog-permissions";
import { useStaffBranchDishesQuery } from "./query/staff-catalog-query";

interface StaffBranchMenuAppProps {
	branchId: string;
}

export function StaffBranchMenuApp({ branchId }: StaffBranchMenuAppProps) {
	return (
		<StaffQueryProvider>
			<StaffAuthProvider>
				<StaffBranchMenuScreen branchId={branchId} />
			</StaffAuthProvider>
		</StaffQueryProvider>
	);
}

function StaffBranchMenuScreen({ branchId }: StaffBranchMenuAppProps) {
	const { session, snapshot } = useStaffAuth();
	const branchQuery = useStaffBranchQuery(session, branchId);
	const dishesQuery = useStaffBranchDishesQuery(session, branchId);
	const [filter, setFilter] = useState<BranchDishFilter>("all");
	const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
	const canConfigure = snapshot.user
		? canConfigureBranchMenu(snapshot.user, branchId)
		: false;
	const selectedDish = (dishesQuery.data ?? []).find(
		(dish) => dish.id === selectedDishId,
	);

	useEffect(() => {
		const updateSelectedDish = () => {
			const dishId = new URLSearchParams(window.location.search).get("dish");
			setSelectedDishId(dishId);
		};

		updateSelectedDish();
		window.addEventListener("popstate", updateSelectedDish);
		return () => window.removeEventListener("popstate", updateSelectedDish);
	}, []);

	return (
		<StaffUnsavedChangesProvider>
			<StaffLayout eyebrow="Configuración comercial" title="Menú de sucursal">
				{snapshot.status === "checking" ? (
					<CatalogListStatus busy message="Comprobando tu sesión…" />
				) : (
					<ProtectedStaffRoute>
						{branchQuery.isPending || dishesQuery.isPending ? (
							<CatalogListStatus busy message="Cargando menú…" />
						) : null}
						{branchQuery.isError ? (
							<MenuError error={branchQuery.error} />
						) : null}
						{dishesQuery.isError ? (
							<MenuError error={dishesQuery.error} />
						) : null}
						{branchQuery.data && snapshot.user ? (
							<>
								<BranchHeader
									branchId={branchId}
									branchName={branchQuery.data.name}
									canConfigure={canConfigure}
								/>
								{selectedDish && canConfigure ? (
									<div className="mb-6">
										<StaffBranchDishConfigurationForm
											branchId={branchId}
											branchStatus={branchQuery.data.status}
											dish={selectedDish}
											session={session}
											userId={snapshot.user.id}
										/>
									</div>
								) : null}
								<StaffBranchMenuList
									branchId={branchId}
									canConfigure={canConfigure}
									dishes={dishesQuery.data ?? []}
									error={dishesQuery.error}
									filter={filter}
									isError={dishesQuery.isError}
									isLoading={dishesQuery.isPending}
									onFilterChange={setFilter}
									onRetry={() => void dishesQuery.refetch()}
								/>
							</>
						) : null}
					</ProtectedStaffRoute>
				)}
			</StaffLayout>
		</StaffUnsavedChangesProvider>
	);
}

function BranchHeader({
	branchId,
	branchName,
	canConfigure,
}: {
	branchId: string;
	branchName: string;
	canConfigure: boolean;
}) {
	return (
		<section className="mb-6 rounded-3xl border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.08)] sm:p-8">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e76832]">
						Menú comercial
					</p>
					<h2 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.06em]">
						{branchName}
					</h2>
					<p className="mt-2 max-w-2xl text-sm leading-6 text-[#12324a]/65">
						{canConfigure
							? "Configura individualmente el precio y la disponibilidad de cada plato."
							: "Consulta el precio y la disponibilidad configurados en esta sucursal."}
					</p>
				</div>
				<Button
					render={
						<a href={`/staff/branches/${encodeURIComponent(branchId)}`} />
					}
					variant="outline"
				>
					Volver a sucursal
				</Button>
			</div>
		</section>
	);
}

function MenuError({ error }: { error: unknown }) {
	const message =
		error instanceof ApiClientError && error.code === "FORBIDDEN"
			? "No tienes permisos para consultar esta sucursal."
			: "No se pudo cargar la información de la sucursal.";

	return (
		<section
			className="grid min-h-56 place-items-center rounded-3xl border border-[#12324a]/10 bg-white/80 p-8 text-center"
			role="alert"
		>
			<p className="text-sm text-[#12324a]/70">{message}</p>
		</section>
	);
}
