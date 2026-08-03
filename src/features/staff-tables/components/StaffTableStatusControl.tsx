import { useState } from "react";
import { toast } from "sonner";
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
import type { StaffBranch } from "@/features/staff-branches/contracts/staff-branch.schemas";
import { ApiClientError } from "@/lib/api/api-error";
import type { StaffTable, TableStatus } from "../contracts/staff-table.schemas";
import { useUpdateStaffTableStatusMutation } from "../query/staff-tables-query";

interface StaffTableStatusControlProps {
	branch: StaffBranch;
	table: StaffTable;
	session: Parameters<typeof useUpdateStaffTableStatusMutation>[0];
}

export function StaffTableStatusControl({
	branch,
	table,
	session,
}: StaffTableStatusControlProps) {
	const [targetStatus, setTargetStatus] = useState<TableStatus | null>(null);
	const updateMutation = useUpdateStaffTableStatusMutation(session);
	const isActivating = targetStatus === "active";

	function openStatusDialog(status: TableStatus): void {
		setTargetStatus(status);
	}

	async function confirmStatusChange(): Promise<void> {
		if (!targetStatus || updateMutation.isPending) return;

		try {
			await updateMutation.mutateAsync({
				branchId: table.branchId,
				tableId: table.id,
				status: targetStatus,
			});
			setTargetStatus(null);
			toast.success(
				targetStatus === "active"
					? "La mesa fue activada."
					: "La mesa fue desactivada.",
			);
		} catch (error) {
			toast.error(getStatusErrorMessage(error));
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
						{table.status === "active"
							? "La mesa participa en la disponibilidad futura de la sucursal."
							: "La mesa no participa en la disponibilidad futura."}
					</p>
					{branch.status === "inactive" ? (
						<p className="mt-2 text-sm text-[#12324a]/65">
							La sucursal está inactiva. Puedes preparar esta mesa, pero no
							habrá disponibilidad hasta activar la sucursal.
						</p>
					) : null}
				</div>
				{table.status === "active" ? (
					<Button
						className="w-full rounded-xl sm:w-auto"
						onClick={() => openStatusDialog("inactive")}
						variant="destructive"
					>
						Desactivar mesa
					</Button>
				) : (
					<Button
						className="w-full rounded-xl sm:w-auto"
						onClick={() => openStatusDialog("active")}
					>
						Activar mesa
					</Button>
				)}
			</div>

			<AlertDialog
				open={targetStatus !== null}
				onOpenChange={(open) => {
					if (!open && !updateMutation.isPending) setTargetStatus(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{isActivating ? "¿Activar esta mesa?" : "¿Desactivar esta mesa?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{isActivating
								? "La mesa podrá participar en la disponibilidad cuando la sucursal esté activa."
								: "La mesa dejará de participar en la disponibilidad futura. Las reservas existentes no se modificarán."}
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
		if (error.code === "FORBIDDEN") {
			return "No tienes permisos para cambiar el estado de esta mesa.";
		}

		if (error.code === "TABLE_NOT_FOUND") {
			return "La mesa ya no existe o no está disponible.";
		}

		if (error.code === "NETWORK_ERROR" || error.status === 0) {
			return "No se pudo conectar con el servidor. Inténtalo nuevamente.";
		}
	}

	return "No se pudo cambiar el estado de la mesa.";
}
