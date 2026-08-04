import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { StaffSessionAccess } from "@/features/staff-auth/session/staff-session";
import { useStaffUnsavedChanges } from "@/features/staff-shell/components/StaffUnsavedChangesProvider";
import { ApiClientError } from "@/lib/api/api-error";
import {
	type BranchDishConfiguration,
	branchDishConfigurationSchema,
	type StaffBranchDish,
} from "../contracts/staff-catalog.schemas";
import {
	type BranchDishConfigurationFormValues,
	branchDishConfigurationDraftSchema,
	branchDishConfigurationFormSchema,
	toReplaceBranchDishConfigurationRequest,
} from "../contracts/staff-catalog-form.schemas";
import {
	hasBranchDishConfigurationConflict,
	readStaffCatalogDraft,
	removeStaffCatalogDraft,
	type StoredCatalogDraft,
	saveStaffCatalogDraft,
} from "../lib/staff-catalog-drafts";
import { useUpdateBranchDishConfigurationMutation } from "../query/staff-catalog-query";
import { CatalogStatusBadge } from "./CatalogStatusBadge";

interface StaffBranchDishConfigurationFormProps {
	branchId: string;
	branchStatus: "active" | "inactive";
	categoryStatus: "active" | "inactive";
	dish: StaffBranchDish;
	session: StaffSessionAccess;
	userId: string;
}

export function StaffBranchDishConfigurationForm({
	branchId,
	branchStatus,
	categoryStatus,
	dish,
	session,
	userId,
}: StaffBranchDishConfigurationFormProps) {
	const [draft, setDraft] = useState<StoredCatalogDraft<
		BranchDishConfigurationFormValues,
		BranchDishConfiguration | null
	> | null>(null);
	const updateMutation = useUpdateBranchDishConfigurationMutation(session);
	const {
		control,
		formState: { errors, isDirty, isSubmitting },
		handleSubmit,
		register,
		reset,
		setFocus,
	} = useForm<BranchDishConfigurationFormValues>({
		defaultValues: getDefaultValues(dish.branchConfiguration),
		mode: "onSubmit",
		resolver: zodResolver(branchDishConfigurationFormSchema),
		shouldFocusError: false,
	});
	const values = useWatch({ control }) as BranchDishConfigurationFormValues;
	const hasDraftConflict = draft
		? hasBranchDishConfigurationConflict(draft.base, dish.branchConfiguration)
		: false;
	useStaffUnsavedChanges(
		`branch-configuration-${branchId}-${dish.id}`,
		isDirty,
	);

	useEffect(() => {
		reset(getDefaultValues(dish.branchConfiguration));
	}, [dish.branchConfiguration, reset]);

	useEffect(() => {
		setDraft(
			readStaffCatalogDraft({
				userId,
				section: "branch-configuration",
				resourceId: dish.id,
				branchId,
				valuesSchema: branchDishConfigurationDraftSchema,
				baseSchema: branchDishConfigurationSchema.nullable(),
			}),
		);
	}, [branchId, dish.id, userId]);

	useEffect(() => {
		if (!isDirty) return;
		saveStaffCatalogDraft({
			userId,
			section: "branch-configuration",
			resourceId: dish.id,
			branchId,
			base: dish.branchConfiguration,
			values,
			valuesSchema: branchDishConfigurationDraftSchema,
			baseSchema: branchDishConfigurationSchema.nullable(),
		});
	}, [branchId, dish.branchConfiguration, dish.id, isDirty, userId, values]);

	async function handleValidSubmit(
		formValues: BranchDishConfigurationFormValues,
	): Promise<void> {
		try {
			const configuration = await updateMutation.mutateAsync({
				branchId,
				dishId: dish.id,
				input: toReplaceBranchDishConfigurationRequest(formValues),
			});
			removeStaffCatalogDraft(
				userId,
				"branch-configuration",
				dish.id,
				branchId,
			);
			setDraft(null);
			if (!configuration) {
				toast.error("El servidor no devolvió la configuración guardada.");
				return;
			}
			reset(configuration);
			toast.success("La configuración del plato fue guardada.");
		} catch (error) {
			toast.error(getConfigurationErrorMessage(error));
		}
	}

	function recoverDraft(): void {
		if (!draft) return;
		reset(draft.values, { keepDefaultValues: true });
		setDraft(null);
	}

	function discardDraft(): void {
		removeStaffCatalogDraft(userId, "branch-configuration", dish.id, branchId);
		setDraft(null);
	}

	return (
		<section className="rounded-3xl border border-[#e76832]/25 bg-white/95 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.08)] sm:p-8">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e76832]">
						Configuración por sucursal
					</p>
					<h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.05em]">
						{dish.name}
					</h2>
					<FieldDescription>
						El precio y la disponibilidad aquí no cambian el estado global del
						plato.
					</FieldDescription>
				</div>
				<CatalogStatusBadge status={dish.status} />
			</div>

			{dish.status === "inactive" ? (
				<StateWarning message="El plato global está inactivo. Puedes preparar la configuración, pero no se publicará hasta activarlo." />
			) : null}
			{branchStatus === "inactive" ? (
				<StateWarning message="La sucursal está inactiva. Puedes preparar la configuración, pero no se publicará hasta activar la sucursal." />
			) : null}
			{categoryStatus === "inactive" ? (
				<StateWarning message="La categoría está inactiva. Puedes preparar la configuración, pero no se publicará hasta activarla." />
			) : null}
			<div className="mt-6">
				<form
					className="space-y-7"
					noValidate
					onSubmit={(event) => {
						void handleSubmit(handleValidSubmit, () => setFocus("price"))(
							event,
						);
					}}
				>
					<FieldSet>
						<FieldGroup className="grid gap-5 sm:grid-cols-2">
							<Field data-invalid={Boolean(errors.price)}>
								<FieldLabel htmlFor={`branch-dish-price-${dish.id}`}>
									Precio (PEN)
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.price)}
									id={`branch-dish-price-${dish.id}`}
									inputMode="decimal"
									placeholder="0.00"
									{...register("price")}
								/>
								<FieldError errors={[errors.price]} />
							</Field>
							<Field data-invalid={Boolean(errors.status)}>
								<FieldLabel htmlFor={`branch-dish-status-${dish.id}`}>
									Estado comercial
								</FieldLabel>
								<select
									aria-invalid={Boolean(errors.status)}
									className="min-h-10 w-full rounded-xl border border-[#12324a]/15 bg-white px-3 text-sm outline-none transition focus-visible:border-[#e76832] focus-visible:ring-4 focus-visible:ring-[#e76832]/15"
									id={`branch-dish-status-${dish.id}`}
									{...register("status")}
								>
									<option value="available">Disponible</option>
									<option value="sold_out">Agotado</option>
									<option value="inactive">Inactivo</option>
								</select>
								<FieldError errors={[errors.status]} />
							</Field>
						</FieldGroup>
					</FieldSet>
					<div className="flex justify-end border-t border-[#12324a]/10 pt-6">
						<Button
							disabled={isSubmitting || updateMutation.isPending || !isDirty}
							type="submit"
						>
							{updateMutation.isPending
								? "Guardando…"
								: "Guardar configuración"}
						</Button>
					</div>
				</form>
			</div>

			<AlertDialog open={draft !== null} onOpenChange={() => undefined}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{hasDraftConflict
								? "La configuración está desactualizada"
								: "Encontramos un borrador"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{hasDraftConflict
								? "La configuración cambió en el servidor desde que guardaste este borrador. ¿Quieres recuperar tu versión?"
								: "Hay una configuración que no terminaste de guardar. Puedes recuperarla o descartarla."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={discardDraft}>
							Descartar
						</AlertDialogCancel>
						<AlertDialogAction onClick={recoverDraft}>
							Recuperar borrador
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}

function getDefaultValues(
	configuration: BranchDishConfiguration | null,
): BranchDishConfigurationFormValues {
	return configuration ?? { price: "", status: "inactive" };
}

function StateWarning({ message }: { message: string }) {
	return (
		<p className="mt-5 rounded-2xl border border-[#e76832]/25 bg-[#e76832]/10 p-4 text-sm leading-6 text-[#8f3d20]">
			{message}
		</p>
	);
}

function getConfigurationErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		if (error.code === "FORBIDDEN")
			return "No tienes permisos para configurar este menú.";
		if (error.code === "BRANCH_NOT_FOUND")
			return "La sucursal ya no existe o no está disponible.";
		if (error.code === "DISH_NOT_FOUND")
			return "El plato ya no existe o no está disponible.";
		if (error.code === "NETWORK_ERROR" || error.status === 0)
			return "No se pudo conectar con el servidor. Inténtalo nuevamente.";
	}
	return "No se pudo guardar la configuración del plato.";
}
