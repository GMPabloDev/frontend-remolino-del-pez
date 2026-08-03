import { useState } from "react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { StaffSessionAccess } from "@/features/staff-auth/session/staff-session";
import { ApiClientError } from "@/lib/api/api-error";
import type {
	BranchStatus,
	StaffBranch,
} from "../contracts/staff-branch.schemas";
import { useUpdateStaffBranchStatusMutation } from "../query/staff-branches-query";

interface StaffBranchStatusControlProps {
	branch: StaffBranch;
	session: StaffSessionAccess;
}

export function StaffBranchStatusControl({
	branch,
	session,
}: StaffBranchStatusControlProps) {
	const [targetStatus, setTargetStatus] = useState<BranchStatus | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const updateMutation = useUpdateStaffBranchStatusMutation(session);
	const hasSchedule = branch.intervals.length > 0;
	const isActivating = targetStatus === "active";

	function openStatusDialog(status: BranchStatus): void {
		setErrorMessage(null);
		setSuccessMessage(null);
		setTargetStatus(status);
	}

	async function confirmStatusChange(): Promise<void> {
		if (!targetStatus || updateMutation.isPending) return;

		try {
			await updateMutation.mutateAsync({
				branchId: branch.id,
				status: targetStatus,
			});
			setTargetStatus(null);
			setSuccessMessage(
				targetStatus === "active"
					? "La sucursal fue activada."
					: "La sucursal fue desactivada.",
			);
		} catch (error) {
			setErrorMessage(getStatusErrorMessage(error));
		}
	}

	return (
		<section className="rounded-2xl border border-[#12324a]/10 bg-[#f4f0e8]/55 p-5">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#12324a]/45">
						Estado operativo
					</p>
					<p className="mt-2 text-sm text-[#12324a]/65">
						{branch.status === "active"
							? "La sucursal está disponible para la operación activa."
							: hasSchedule
								? "La sucursal tiene horarios listos para activarse."
								: "Configura al menos un horario antes de activarla."}
					</p>
				</div>
				{branch.status === "active" ? (
					<Button
						className="w-full rounded-xl sm:w-auto"
						onClick={() => openStatusDialog("inactive")}
						variant="destructive"
					>
						Desactivar sucursal
					</Button>
				) : (
					<Button
						className="w-full rounded-xl sm:w-auto"
						disabled={!hasSchedule}
						onClick={() => openStatusDialog("active")}
					>
						Activar sucursal
					</Button>
				)}
			</div>
			{errorMessage ? (
				<p
					className="mt-4 rounded-xl border border-[#b34b25]/25 bg-[#b34b25]/10 px-4 py-3 text-sm leading-6 text-[#8f3d20]"
					role="alert"
				>
					{errorMessage}
				</p>
			) : null}
			{successMessage ? (
				<p
					className="mt-4 rounded-xl border border-[#338faa]/25 bg-[#dcecef] px-4 py-3 text-sm leading-6 text-[#12324a]"
					role="status"
				>
					{successMessage}
				</p>
			) : null}

			<AlertDialog
				open={targetStatus !== null}
				onOpenChange={(open) => {
					if (!open && !updateMutation.isPending) setTargetStatus(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{isActivating
								? "¿Activar esta sucursal?"
								: "¿Desactivar esta sucursal?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{isActivating
								? "La sucursal podrá participar en la operación activa según sus horarios."
								: "La sucursal dejará de estar disponible, pero conservará sus datos y horarios."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={updateMutation.isPending}>
							Cancelar
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={updateMutation.isPending}
							onClick={(event) => {
								event.preventDefault();
								void confirmStatusChange();
							}}
						>
							{updateMutation.isPending ? "Guardando…" : "Confirmar"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}

function getStatusErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		if (error.code === "BRANCH_SCHEDULE_REQUIRED") {
			return "La sucursal necesita al menos un horario para activarse.";
		}

		if (error.code === "FORBIDDEN") {
			return "No tienes permisos para cambiar el estado de esta sucursal.";
		}

		if (error.code === "NETWORK_ERROR" || error.status === 0) {
			return "No se pudo conectar con el servidor. Inténtalo nuevamente.";
		}
	}

	return "No se pudo cambiar el estado de la sucursal.";
}
