import { useEffect, useState } from "react";

import { ProtectedStaffRoute } from "@/features/staff-auth/components/ProtectedStaffRoute";
import {
	StaffAuthProvider,
	useStaffAuth,
} from "@/features/staff-auth/components/StaffAuthProvider";
import { StaffQueryProvider } from "@/features/staff-auth/query/staff-query-client";
import { StaffLayout } from "@/features/staff-shell/components/StaffLayout";
import { StaffBranchList } from "./components/StaffBranchList";
import {
	type BranchStatusFilter,
	getBranchStatusQuery,
	parseBranchStatusFilter,
} from "./lib/branch-status-filter";
import { canCreateStaffBranch } from "./lib/staff-branch-permissions";
import { useStaffBranchesQuery } from "./query/staff-branches-query";

export function StaffBranchesApp() {
	return (
		<StaffQueryProvider>
			<StaffAuthProvider>
				<StaffBranchesScreen />
			</StaffAuthProvider>
		</StaffQueryProvider>
	);
}

function StaffBranchesScreen() {
	const { session, snapshot } = useStaffAuth();
	const [filter, setFilter] = useState<BranchStatusFilter>("all");
	const status = getBranchStatusQuery(filter);
	const branchesQuery = useStaffBranchesQuery(session, status);

	useEffect(() => {
		const updateFilter = () => {
			const params = new URLSearchParams(window.location.search);
			setFilter(parseBranchStatusFilter(params.get("status")));
		};

		updateFilter();
		window.addEventListener("popstate", updateFilter);
		return () => window.removeEventListener("popstate", updateFilter);
	}, []);

	return (
		<ProtectedStaffRoute>
			<StaffLayout title="Sucursales">
				{snapshot.user ? (
					<StaffBranchList
						branches={branchesQuery.data ?? []}
						canCreate={canCreateStaffBranch(snapshot.user.role)}
						error={branchesQuery.error}
						filter={filter}
						isError={branchesQuery.isError}
						isLoading={branchesQuery.isPending}
						onRetry={() => void branchesQuery.refetch()}
					/>
				) : null}
			</StaffLayout>
		</ProtectedStaffRoute>
	);
}
