import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { ProtectedStaffRoute } from "@/features/staff-auth/components/ProtectedStaffRoute";
import {
	StaffAuthProvider,
	useStaffAuth,
} from "@/features/staff-auth/components/StaffAuthProvider";
import { StaffQueryProvider } from "@/features/staff-auth/query/staff-query-client";
import { StaffLayout } from "@/features/staff-shell/components/StaffLayout";
import { StaffUnsavedChangesProvider } from "@/features/staff-shell/components/StaffUnsavedChangesProvider";
import { createStaffBranchesClient } from "./api/staff-branches-client";
import { StaffBranchCreateForm } from "./components/StaffBranchCreateForm";
import { canCreateStaffBranch } from "./lib/staff-branch-permissions";

export function StaffBranchCreateApp() {
	return (
		<StaffQueryProvider>
			<StaffAuthProvider>
				<StaffBranchCreateScreen />
			</StaffAuthProvider>
		</StaffQueryProvider>
	);
}

function StaffBranchCreateScreen() {
	const { session, snapshot } = useStaffAuth();
	const client = useMemo(() => createStaffBranchesClient(session), [session]);
	const canCreate = snapshot.user
		? canCreateStaffBranch(snapshot.user.role)
		: false;

	return (
		<StaffUnsavedChangesProvider>
			<ProtectedStaffRoute>
				<StaffLayout eyebrow="Gestión de sucursales" title="Nueva sucursal">
					{snapshot.user && canCreate ? (
						<section className="max-w-5xl rounded-3xl border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.08)] sm:p-8">
							<div className="mb-8 space-y-3">
								<p className="text-sm leading-6 text-[#12324a]/65">
									Completa los datos y las reglas iniciales. La sucursal se
									creará inactiva y podrás configurar su horario después.
								</p>
							</div>
							<StaffBranchCreateForm
								client={client}
								userId={snapshot.user.id}
							/>
						</section>
					) : (
						<NoCreatePermission />
					)}
				</StaffLayout>
			</ProtectedStaffRoute>
		</StaffUnsavedChangesProvider>
	);
}

function NoCreatePermission() {
	return (
		<section className="max-w-2xl rounded-3xl border border-[#12324a]/10 bg-white/90 p-8 shadow-[0_20px_60px_rgba(18,50,74,0.08)]">
			<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e76832]">
				Acceso restringido
			</p>
			<h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.05em]">
				No puedes crear sucursales
			</h2>
			<p className="mt-3 text-sm leading-6 text-[#12324a]/65">
				Tu rol solo permite administrar la sucursal que tienes asignada.
			</p>
			<Button className="mt-6 rounded-xl" render={<a href="/staff/branches" />}>
				Volver a sucursales
			</Button>
		</section>
	);
}
