import { useEffect, useState } from "react";

import { ProtectedStaffRoute } from "@/features/staff-auth/components/ProtectedStaffRoute";
import {
	StaffAuthProvider,
	useStaffAuth,
} from "@/features/staff-auth/components/StaffAuthProvider";
import { StaffQueryProvider } from "@/features/staff-auth/query/staff-query-client";
import { StaffLayout } from "@/features/staff-shell/components/StaffLayout";
import { StaffUnsavedChangesProvider } from "@/features/staff-shell/components/StaffUnsavedChangesProvider";
import { CatalogListStatus } from "./components/CatalogListStatus";
import { StaffDishList } from "./components/StaffDishList";
import {
	type CatalogStatusFilter,
	getCatalogStatusQuery,
	parseCatalogStatusFilter,
} from "./lib/catalog-status-filter";
import {
	canCreateStaffCatalog,
	canManageStaffCatalog,
} from "./lib/staff-catalog-permissions";
import { useStaffDishesQuery } from "./query/staff-catalog-query";

export function StaffCatalogDishesApp() {
	return (
		<StaffQueryProvider>
			<StaffAuthProvider>
				<StaffCatalogDishesScreen />
			</StaffAuthProvider>
		</StaffQueryProvider>
	);
}

function StaffCatalogDishesScreen() {
	const { session, snapshot } = useStaffAuth();
	const [filter, setFilter] = useState<CatalogStatusFilter>("all");
	const dishesQuery = useStaffDishesQuery(
		session,
		getCatalogStatusQuery(filter),
	);

	useEffect(() => {
		const updateFilter = () => {
			const params = new URLSearchParams(window.location.search);
			setFilter(parseCatalogStatusFilter(params.get("status")));
		};

		updateFilter();
		window.addEventListener("popstate", updateFilter);
		return () => window.removeEventListener("popstate", updateFilter);
	}, []);

	return (
		<StaffUnsavedChangesProvider>
			<StaffLayout eyebrow="Gestión del catálogo" title="Platos">
				{snapshot.status === "checking" ? (
					<CatalogListStatus busy message="Comprobando tu sesión…" />
				) : (
					<ProtectedStaffRoute>
						{snapshot.user ? (
							<StaffDishList
								canCreate={canCreateStaffCatalog(snapshot.user.role)}
								canManage={canManageStaffCatalog(snapshot.user.role)}
								dishes={dishesQuery.data ?? []}
								error={dishesQuery.error}
								filter={filter}
								isError={dishesQuery.isError}
								isLoading={dishesQuery.isPending}
								onRetry={() => void dishesQuery.refetch()}
							/>
						) : null}
					</ProtectedStaffRoute>
				)}
			</StaffLayout>
		</StaffUnsavedChangesProvider>
	);
}
