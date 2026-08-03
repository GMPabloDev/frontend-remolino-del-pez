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
import { StaffCategoryList } from "./components/StaffCategoryList";
import {
	type CatalogStatusFilter,
	getCatalogStatusQuery,
	parseCatalogStatusFilter,
} from "./lib/catalog-status-filter";
import {
	canCreateStaffCatalog,
	canManageStaffCatalog,
} from "./lib/staff-catalog-permissions";
import { useStaffCategoriesQuery } from "./query/staff-catalog-query";

export function StaffCatalogCategoriesApp() {
	return (
		<StaffQueryProvider>
			<StaffAuthProvider>
				<StaffCatalogCategoriesScreen />
			</StaffAuthProvider>
		</StaffQueryProvider>
	);
}

function StaffCatalogCategoriesScreen() {
	const { session, snapshot } = useStaffAuth();
	const [filter, setFilter] = useState<CatalogStatusFilter>("all");
	const status = getCatalogStatusQuery(filter);
	const categoriesQuery = useStaffCategoriesQuery(session, status);

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
			<StaffLayout eyebrow="Gestión del catálogo" title="Categorías">
				{snapshot.status === "checking" ? (
					<CatalogListStatus busy message="Comprobando tu sesión…" />
				) : (
					<ProtectedStaffRoute>
						{snapshot.user ? (
							<StaffCategoryList
								categories={categoriesQuery.data ?? []}
								canCreate={canCreateStaffCatalog(snapshot.user.role)}
								canManage={canManageStaffCatalog(snapshot.user.role)}
								error={categoriesQuery.error}
								filter={filter}
								isError={categoriesQuery.isError}
								isLoading={categoriesQuery.isPending}
								onRetry={() => void categoriesQuery.refetch()}
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
