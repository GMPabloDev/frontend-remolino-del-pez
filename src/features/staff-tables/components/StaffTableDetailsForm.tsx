import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { type FieldErrors, useForm, useWatch } from "react-hook-form";
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
import { useStaffUnsavedChanges } from "@/features/staff-shell/components/StaffUnsavedChangesProvider";
import { ApiClientError } from "@/lib/api/api-error";
import type { StaffTable } from "../contracts/staff-table.schemas";
import {
	type TableFormValues,
	tableFormSchema,
	toUpdateTableRequest,
} from "../contracts/staff-table-form.schemas";
import {
	hasStaffTableDraftConflict,
	readStaffTableDraft,
	removeStaffTableDraft,
	type StoredStaffTableDraft,
	saveStaffTableDraft,
} from "../lib/staff-table-drafts";
import { useUpdateStaffTableMutation } from "../query/staff-tables-query";

interface StaffTableDetailsFormProps {
	branchId: string;
	table: StaffTable;
	userId: string;
	session: Parameters<typeof useUpdateStaffTableMutation>[0];
}

export function StaffTableDetailsForm({
	branchId,
	table,
	userId,
	session,
}: StaffTableDetailsFormProps) {
	const [draft, setDraft] =
		useState<StoredStaffTableDraft<TableFormValues> | null>(null);
	const updateMutation = useUpdateStaffTableMutation(session);
	const {
		control,
		formState: { errors, isDirty, isSubmitting },
		handleSubmit,
		register,
		reset,
		setError,
		setFocus,
	} = useForm<TableFormValues>({
		defaultValues: getDefaultValues(table),
		mode: "onSubmit",
		resolver: zodResolver(tableFormSchema),
		shouldFocusError: false,
	});
	const values = useWatch({ control }) as TableFormValues;
	const hasDraftConflict = draft
		? hasStaffTableDraftConflict(draft, table.updatedAt)
		: false;
	useStaffUnsavedChanges("details", isDirty);

	useEffect(() => {
		reset(getDefaultValues(table));
	}, [reset, table]);

	useEffect(() => {
		setDraft(
			readStaffTableDraft({
				userId,
				branchId,
				tableId: table.id,
				section: "details",
				valuesSchema: tableFormSchema,
			}),
		);
	}, [branchId, table.id, userId]);

	useEffect(() => {
		if (!isDirty) return;

		saveStaffTableDraft({
			userId,
			branchId,
			tableId: table.id,
			section: "details",
			baseUpdatedAt: table.updatedAt,
			values,
			valuesSchema: tableFormSchema,
		});
	}, [branchId, isDirty, table.id, table.updatedAt, userId, values]);

	async function handleValidSubmit(formValues: TableFormValues): Promise<void> {
		try {
			const updatedTable = await updateMutation.mutateAsync({
				branchId,
				tableId: table.id,
				input: toUpdateTableRequest(formValues),
			});
			removeStaffTableDraft(userId, branchId, table.id, "details");
			setDraft(null);
			reset(getDefaultValues(updatedTable));
			toast.success("Los datos de la mesa fueron guardados.");
		} catch (error) {
			setTableError(error);
		}
	}

	function handleInvalidSubmit(formErrors: FieldErrors<TableFormValues>): void {
		const firstField = getFirstInvalidField(formErrors);
		if (firstField) setFocus(firstField);
	}

	function setTableError(error: unknown): void {
		if (
			error instanceof ApiClientError &&
			error.code === "TABLE_CODE_ALREADY_EXISTS"
		) {
			setError("code", {
				message: "Este código ya está registrado en esta sucursal.",
				type: "server",
			});
			setFocus("code");
			return;
		}

		toast.error(getUpdateTableErrorMessage(error));
	}

	function recoverDraft(): void {
		if (!draft) return;
		reset(draft.values, { keepDefaultValues: true });
		setDraft(null);
	}

	function discardDraft(): void {
		removeStaffTableDraft(userId, branchId, table.id, "details");
		setDraft(null);
	}

	return (
		<section className="rounded-3xl border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.08)] sm:p-8">
			<div className="mb-8 space-y-3">
				<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e76832]">
					Datos de la mesa
				</p>
				<h2 className="font-heading text-2xl font-semibold tracking-[-0.04em]">
					Código y capacidad
				</h2>
				<FieldDescription>
					Actualiza ambos datos en un único guardado.
				</FieldDescription>
			</div>

			<form
				className="space-y-7"
				noValidate
				onSubmit={(event) => {
					void handleSubmit(handleValidSubmit, handleInvalidSubmit)(event);
				}}
			>
				<FieldSet>
					<FieldGroup className="grid gap-5 sm:grid-cols-2">
						<Field data-invalid={Boolean(errors.code)}>
							<FieldLabel htmlFor="table-details-code">Código</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.code)}
								id="table-details-code"
								placeholder="TERRAZA-02"
								{...register("code")}
							/>
							<FieldError errors={[errors.code]} />
						</Field>
						<Field data-invalid={Boolean(errors.capacity)}>
							<FieldLabel htmlFor="table-details-capacity">
								Capacidad
							</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.capacity)}
								id="table-details-capacity"
								min={1}
								type="number"
								{...register("capacity", { valueAsNumber: true })}
							/>
							<FieldError errors={[errors.capacity]} />
						</Field>
					</FieldGroup>
				</FieldSet>
				<div className="flex justify-end border-t border-[#12324a]/10 pt-6">
					<Button
						disabled={isSubmitting || updateMutation.isPending || !isDirty}
						type="submit"
					>
						{updateMutation.isPending ? "Guardando…" : "Guardar datos"}
					</Button>
				</div>
			</form>

			<AlertDialog open={draft !== null} onOpenChange={() => undefined}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{hasDraftConflict
								? "El borrador está desactualizado"
								: "Encontramos un borrador"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{hasDraftConflict
								? "La mesa cambió en el servidor desde que guardaste este borrador. ¿Quieres reemplazar esos cambios con tu versión?"
								: "Hay datos de la mesa que no terminaste de guardar. Puedes recuperarlos o empezar con los datos actuales."}
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

function getDefaultValues(table: StaffTable): TableFormValues {
	return { code: table.code, capacity: table.capacity };
}

function getFirstInvalidField(
	errors: FieldErrors<TableFormValues>,
): keyof TableFormValues | null {
	if (errors.code) return "code";
	if (errors.capacity) return "capacity";
	return null;
}

function getUpdateTableErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		if (error.code === "FORBIDDEN") {
			return "No tienes permisos para editar esta mesa.";
		}

		if (error.code === "TABLE_NOT_FOUND") {
			return "La mesa ya no existe o no está disponible.";
		}

		if (error.code === "NETWORK_ERROR" || error.status === 0) {
			return "No se pudo conectar con el servidor. Inténtalo nuevamente.";
		}
	}

	return "No se pudieron guardar los datos de la mesa. Inténtalo nuevamente.";
}
