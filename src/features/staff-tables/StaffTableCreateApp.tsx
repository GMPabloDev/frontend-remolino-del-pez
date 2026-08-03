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
import { StaffTableCreateForm } from "./components/StaffTableCreateForm";
import { canCreateStaffTable } from "./lib/staff-table-permissions";

interface StaffTableCreateAppProps {
	branchId: string;
}

export function StaffTableCreateApp({ branchId }: StaffTableCreateAppProps) {
	return (
		<StaffQueryProvider>
			<StaffAuthProvider>
				<StaffTableCreateScreen branchId={branchId} />
			</StaffAuthProvider>
		</StaffQueryProvider>
	);
}

function StaffTableCreateScreen({ branchId }: StaffTableCreateAppProps) {
	const { session, snapshot } = useStaffAuth();
	const branchQuery = useStaffBranchQuery(session, branchId);
	const canCreate = snapshot.user
		? canCreateStaffTable(snapshot.user.role)
		: false;

	return (
		<StaffUnsavedChangesProvider>
			<ProtectedStaffRoute>
				<StaffLayout eyebrow="Gestión de mesas" title="Nueva mesa">
					{snapshot.status === "checking" || branchQuery.isPending ? (
						<CreateStatus message="Cargando la sucursal…" busy />
					) : null}
					{branchQuery.isError ? (
						<CreateError error={branchQuery.error} />
					) : null}
					{branchQuery.data && snapshot.user && canCreate ? (
						<section className="max-w-3xl rounded-3xl border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.08)] sm:p-8">
							<div className="mb-8 space-y-3">
								<p className="text-sm leading-6 text-[#12324a]/65">
									Configura una mesa para {branchQuery.data.name}.
								</p>
							</div>
							<StaffTableCreateForm
								branchId={branchId}
								userId={snapshot.user.id}
								session={session}
							/>
						</section>
					) : null}
					{branchQuery.data && snapshot.user && !canCreate ? (
						<NoCreatePermission branchId={branchId} />
					) : null}
				</StaffLayout>
			</ProtectedStaffRoute>
		</StaffUnsavedChangesProvider>
	);
}

function CreateStatus({
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

function CreateError({ error }: { error: unknown }) {
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

function NoCreatePermission({ branchId }: { branchId: string }) {
	return (
		<section className="max-w-2xl rounded-3xl border border-[#12324a]/10 bg-white/90 p-8 shadow-[0_20px_60px_rgba(18,50,74,0.08)]">
			<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e76832]">
				Acceso restringido
			</p>
			<h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.05em]">
				No puedes crear mesas
			</h2>
			<p className="mt-3 text-sm leading-6 text-[#12324a]/65">
				Tu rol solo permite consultar, editar y cambiar el estado de las mesas
				de tu sucursal asignada.
			</p>
			<Button
				className="mt-6"
				render={<a href={`/staff/branches/${branchId}/tables`} />}
			>
				Volver a mesas
			</Button>
		</section>
	);
}
