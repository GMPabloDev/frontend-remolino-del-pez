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
import { ApiClientError } from "@/lib/api/api-error";
import { StaffTableList } from "./components/StaffTableList";
import { canCreateStaffTable } from "./lib/staff-table-permissions";
import {
	getTableStatusQuery,
	parseTableStatusFilter,
	type TableStatusFilter,
} from "./lib/table-status-filter";
import { useStaffTablesQuery } from "./query/staff-tables-query";

interface StaffTablesAppProps {
	branchId: string;
}

export function StaffTablesApp({ branchId }: StaffTablesAppProps) {
	return (
		<StaffQueryProvider>
			<StaffAuthProvider>
				<StaffTablesScreen branchId={branchId} />
			</StaffAuthProvider>
		</StaffQueryProvider>
	);
}

function StaffTablesScreen({ branchId }: StaffTablesAppProps) {
	const { session, snapshot } = useStaffAuth();
	const [filter, setFilter] = useState<TableStatusFilter>("all");
	const branchQuery = useStaffBranchQuery(session, branchId);
	const status = getTableStatusQuery(filter);
	const tablesQuery = useStaffTablesQuery(
		session,
		branchQuery.data ? branchId : "",
		status,
	);

	useEffect(() => {
		const updateFilter = () => {
			const params = new URLSearchParams(window.location.search);
			setFilter(parseTableStatusFilter(params.get("status")));
		};

		updateFilter();
		window.addEventListener("popstate", updateFilter);
		return () => window.removeEventListener("popstate", updateFilter);
	}, []);

	return (
		<StaffLayout eyebrow="Gestión de mesas" title="Mesas de la sucursal">
			{snapshot.status === "checking" ? (
				<TableContextStatus busy message="Cargando la sucursal…" />
			) : (
				<ProtectedStaffRoute>
					{branchQuery.isPending ? (
						<TableContextStatus busy message="Cargando la sucursal…" />
					) : null}
					{branchQuery.isError ? (
						<TableContextError error={branchQuery.error} />
					) : null}
					{branchQuery.data && snapshot.user ? (
						<StaffTableList
							branchId={branchId}
							branchName={branchQuery.data.name}
							tables={tablesQuery.data ?? []}
							filter={filter}
							canCreate={canCreateStaffTable(snapshot.user.role)}
							isError={tablesQuery.isError}
							error={tablesQuery.error}
							isLoading={tablesQuery.isPending}
							onRetry={() => void tablesQuery.refetch()}
						/>
					) : null}
				</ProtectedStaffRoute>
			)}
		</StaffLayout>
	);
}

function TableContextStatus({
	message,
	busy = false,
}: {
	message: string;
	busy?: boolean;
}) {
	return (
		<div
			aria-busy={busy}
			className="grid min-h-56 place-items-center"
			role="status"
		>
			<p className="text-sm text-[#12324a]/70">{message}</p>
		</div>
	);
}

function TableContextError({ error }: { error: unknown }) {
	const message =
		error instanceof ApiClientError && error.code === "FORBIDDEN"
			? "No tienes permisos para consultar esta sucursal."
			: error instanceof ApiClientError && error.code === "BRANCH_NOT_FOUND"
				? "La sucursal no existe o no está disponible."
				: "No se pudo cargar la sucursal.";

	return (
		<section
			className="grid min-h-56 place-items-center rounded-3xl border border-[#12324a]/10 bg-white/80 p-8 text-center"
			role="alert"
		>
			<div className="space-y-4">
				<p className="text-sm text-[#12324a]/70">{message}</p>
				<Button render={<a href="/staff/branches" />}>
					Volver a sucursales
				</Button>
			</div>
		</section>
	);
}
