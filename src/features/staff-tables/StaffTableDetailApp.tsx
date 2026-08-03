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
import type { StaffBranch } from "@/features/staff-branches/contracts/staff-branch.schemas";
import { useStaffBranchQuery } from "@/features/staff-branches/query/staff-branches-query";
import { StaffLayout } from "@/features/staff-shell/components/StaffLayout";
import { StaffUnsavedChangesProvider } from "@/features/staff-shell/components/StaffUnsavedChangesProvider";
import { ApiClientError } from "@/lib/api/api-error";
import { StaffTableDetailsForm } from "./components/StaffTableDetailsForm";
import { StaffTableStatusControl } from "./components/StaffTableStatusControl";
import type { StaffTable } from "./contracts/staff-table.schemas";
import { useStaffTableQuery } from "./query/staff-tables-query";

interface StaffTableDetailAppProps {
	branchId: string;
	tableId: string;
}

export function StaffTableDetailApp({
	branchId,
	tableId,
}: StaffTableDetailAppProps) {
	return (
		<StaffQueryProvider>
			<StaffAuthProvider>
				<StaffTableDetailScreen branchId={branchId} tableId={tableId} />
			</StaffAuthProvider>
		</StaffQueryProvider>
	);
}

function StaffTableDetailScreen({
	branchId,
	tableId,
}: StaffTableDetailAppProps) {
	const { session, snapshot } = useStaffAuth();
	const branchQuery = useStaffBranchQuery(session, branchId);
	const tableQuery = useStaffTableQuery(
		session,
		branchQuery.data ? branchId : "",
		tableId,
	);

	useEffect(() => {
		const url = new URL(window.location.href);
		if (url.searchParams.get("created") !== "1") return;

		toast.success("La mesa fue creada correctamente.");
		url.searchParams.delete("created");
		window.history.replaceState(
			{},
			"",
			`${url.pathname}${url.search}${url.hash}`,
		);
	}, []);

	return (
		<StaffUnsavedChangesProvider>
			<StaffLayout eyebrow="Gestión de mesas" title="Administrar mesa">
				{snapshot.status === "checking" ? (
					<DetailStatus busy message="Cargando la sucursal…" />
				) : (
					<ProtectedStaffRoute>
						{branchQuery.isPending ? (
							<DetailStatus busy message="Cargando la sucursal…" />
						) : null}
						{branchQuery.isError ? (
							<DetailError
								error={branchQuery.error}
								onRetry={() => void branchQuery.refetch()}
								backHref={`/staff/branches/${encodeURIComponent(branchId)}/tables`}
							/>
						) : null}
						{branchQuery.data && tableQuery.isPending ? (
							<DetailStatus busy message="Cargando la mesa…" />
						) : null}
						{branchQuery.data && tableQuery.isError ? (
							<DetailError
								error={tableQuery.error}
								onRetry={() => void tableQuery.refetch()}
								backHref={`/staff/branches/${encodeURIComponent(branchId)}/tables`}
							/>
						) : null}
						{branchQuery.data && tableQuery.data && snapshot.user ? (
							<TableOverview
								branch={branchQuery.data}
								session={session}
								table={tableQuery.data}
								userId={snapshot.user.id}
							/>
						) : null}
					</ProtectedStaffRoute>
				)}
			</StaffLayout>
		</StaffUnsavedChangesProvider>
	);
}

function TableOverview({
	branch,
	session,
	table,
	userId,
}: {
	branch: StaffBranch;
	session: StaffSessionAccess;
	table: StaffTable;
	userId: string;
}) {
	return (
		<div className="space-y-6">
			<section className="rounded-3xl border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.08)] sm:p-8">
				<div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e76832]">
							Mesa de {branch.name}
						</p>
						<h2 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.06em]">
							{table.code}
						</h2>
						<p className="mt-2 text-sm text-[#12324a]/55">
							Capacidad para {table.capacity} personas
						</p>
					</div>
					<TableStatusBadge status={table.status} />
				</div>

				<div className="mt-8 grid gap-4 border-t border-[#12324a]/10 pt-6 sm:grid-cols-2">
					<InfoCard label="Código" value={table.code} />
					<InfoCard label="Capacidad" value={`${table.capacity} personas`} />
					<InfoCard label="Sucursal" value={branch.name} />
					<InfoCard
						label="Estado de sucursal"
						value={branch.status === "active" ? "Activa" : "Inactiva"}
					/>
				</div>
			</section>

			<StaffTableDetailsForm
				branchId={branch.id}
				session={session}
				table={table}
				userId={userId}
			/>
			<StaffTableStatusControl
				branch={branch}
				session={session}
				table={table}
			/>
		</div>
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

function TableStatusBadge({ status }: { status: StaffTable["status"] }) {
	const isActive = status === "active";

	return (
		<span
			className={`inline-flex rounded-full px-4 py-2 text-sm font-bold ${isActive ? "bg-[#dcecef] text-[#236d7d]" : "bg-[#12324a]/8 text-[#12324a]/65"}`}
		>
			{isActive ? "Activa" : "Inactiva"}
		</span>
	);
}

function DetailStatus({
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

function DetailError({
	error,
	onRetry,
	backHref,
}: {
	error: unknown;
	onRetry: () => void;
	backHref: string;
}) {
	const isNotFound =
		error instanceof ApiClientError &&
		(error.code === "TABLE_NOT_FOUND" || error.code === "BRANCH_NOT_FOUND");
	const isForbidden =
		error instanceof ApiClientError && error.code === "FORBIDDEN";
	const message = isNotFound
		? "La mesa o la sucursal ya no existe."
		: isForbidden
			? "No tienes permisos para consultar esta mesa."
			: error instanceof ApiClientError &&
					(error.code === "NETWORK_ERROR" || error.status === 0)
				? "No se pudo conectar con el servidor."
				: "No se pudo cargar la mesa.";

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
					<Button render={<a href={backHref} />}>Volver a mesas</Button>
				</div>
			</div>
		</section>
	);
}
