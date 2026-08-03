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
import type {
	CatalogStatus,
	MenuCategory,
} from "../contracts/staff-catalog.schemas";
import { useUpdateMenuCategoryStatusMutation } from "../query/staff-catalog-query";

interface StaffCategoryStatusControlProps {
	category: MenuCategory;
	session: StaffSessionAccess;
}

export function StaffCategoryStatusControl({
	category,
	session,
}: StaffCategoryStatusControlProps) {
	const [targetStatus, setTargetStatus] = useState<CatalogStatus | null>(null);
	const updateMutation = useUpdateMenuCategoryStatusMutation(session);
	const isActivating = targetStatus === "active";

	async function confirmStatusChange(): Promise<void> {
		if (!targetStatus || updateMutation.isPending) return;

		try {
			await updateMutation.mutateAsync({
				categoryId: category.id,
				status: targetStatus,
			});
			setTargetStatus(null);
			toast.success(
				targetStatus === "active"
					? "La categoría fue activada."
					: "La categoría fue desactivada.",
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
						Estado de publicación
					</p>
					<p className="mt-2 text-sm leading-6 text-[#12324a]/65">
						{category.status === "active"
							? "La categoría y sus platos pueden aparecer en el menú público."
							: "La categoría conserva sus datos, pero no se publica en el menú."}
					</p>
				</div>
				{category.status === "active" ? (
					<Button
						className="w-full rounded-xl sm:w-auto"
						onClick={() => setTargetStatus("inactive")}
						variant="destructive"
					>
						Desactivar categoría
					</Button>
				) : (
					<Button
						className="w-full rounded-xl sm:w-auto"
						onClick={() => setTargetStatus("active")}
					>
						Activar categoría
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
							{isActivating
								? "¿Activar esta categoría?"
								: "¿Desactivar esta categoría?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{isActivating
								? "La categoría podrá mostrarse en el menú público cuando sus demás condiciones de publicación se cumplan."
								: "La categoría dejará de publicarse, pero conservará sus platos y configuraciones por sucursal."}
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
			return "No tienes permisos para cambiar el estado de esta categoría.";
		}

		if (error.code === "MENU_CATEGORY_NOT_FOUND") {
			return "La categoría ya no existe o no está disponible.";
		}

		if (error.code === "NETWORK_ERROR" || error.status === 0) {
			return "No se pudo conectar con el servidor. Inténtalo nuevamente.";
		}
	}

	return "No se pudo cambiar el estado de la categoría.";
}
