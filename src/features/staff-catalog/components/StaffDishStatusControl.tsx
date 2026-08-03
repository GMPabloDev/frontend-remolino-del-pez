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
import type { StaffSessionAccess } from "@/features/staff-auth/session/staff-session";
import { ApiClientError } from "@/lib/api/api-error";
import type { StaffDish } from "../contracts/staff-catalog.schemas";
import { useUpdateDishStatusMutation } from "../query/staff-catalog-query";
import { CatalogStatusBadge } from "./CatalogStatusBadge";

interface StaffDishStatusControlProps {
	dish: StaffDish;
	session: StaffSessionAccess;
}

export function StaffDishStatusControl({
	dish,
	session,
}: StaffDishStatusControlProps) {
	const [nextStatus, setNextStatus] = useState<"active" | "inactive" | null>(
		null,
	);
	const statusMutation = useUpdateDishStatusMutation(session);
	const isActive = dish.status === "active";

	async function confirmStatusChange(): Promise<void> {
		if (!nextStatus) return;

		try {
			await statusMutation.mutateAsync({ dishId: dish.id, status: nextStatus });
			setNextStatus(null);
			toast.success(
				nextStatus === "active"
					? "El plato fue activado."
					: "El plato fue desactivado.",
			);
		} catch (error) {
			toast.error(getStatusErrorMessage(error));
		}
	}

	return (
		<section className="rounded-3xl border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.08)] sm:p-8">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e76832]">
						Publicación global
					</p>
					<h2 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.045em]">
						Estado del plato
					</h2>
					<p className="mt-2 max-w-2xl text-sm leading-6 text-[#12324a]/65">
						{isActive
							? "El plato puede publicarse cuando la categoría y la configuración de la sucursal también estén activas."
							: "Desactivar el plato conserva sus configuraciones por sucursal, pero deja de publicarlo."}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<CatalogStatusBadge status={dish.status} />
					<Button
						onClick={() => setNextStatus(isActive ? "inactive" : "active")}
						variant={isActive ? "outline" : "default"}
					>
						{isActive ? "Desactivar" : "Activar"}
					</Button>
				</div>
			</div>

			<AlertDialog
				open={nextStatus !== null}
				onOpenChange={(open) => {
					if (!open && !statusMutation.isPending) setNextStatus(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{nextStatus === "active"
								? "¿Activar este plato?"
								: "¿Desactivar este plato?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{nextStatus === "active"
								? "El plato podrá publicarse cuando sus demás estados globales y comerciales lo permitan."
								: "El plato dejará de publicarse, pero conservará sus configuraciones por sucursal."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={statusMutation.isPending}>
							Cancelar
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={statusMutation.isPending}
							onClick={(event) => {
								event.preventDefault();
								void confirmStatusChange();
							}}
						>
							{statusMutation.isPending ? "Guardando…" : "Confirmar"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}

function getStatusErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		if (error.code === "FORBIDDEN")
			return "No tienes permisos para cambiar el estado del plato.";
		if (error.code === "DISH_NOT_FOUND")
			return "El plato ya no existe o no está disponible.";
		if (error.code === "NETWORK_ERROR" || error.status === 0) {
			return "No se pudo conectar con el servidor. Inténtalo nuevamente.";
		}
	}
	return "No se pudo cambiar el estado del plato.";
}
