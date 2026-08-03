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
import type { TableFormValues } from "../contracts/staff-table-form.schemas";
import {
	tableFormSchema,
	toCreateTableRequest,
} from "../contracts/staff-table-form.schemas";
import {
	readStaffTableDraft,
	removeStaffTableDraft,
	type StoredStaffTableDraft,
	saveStaffTableDraft,
} from "../lib/staff-table-drafts";
import { useCreateStaffTableMutation } from "../query/staff-tables-query";

interface StaffTableCreateFormProps {
	branchId: string;
	userId: string;
	session: Parameters<typeof useCreateStaffTableMutation>[0];
}

const defaultValues = {
	code: "",
	capacity: undefined,
};

export function StaffTableCreateForm({
	branchId,
	userId,
	session,
}: StaffTableCreateFormProps) {
	const [draft, setDraft] =
		useState<StoredStaffTableDraft<TableFormValues> | null>(null);
	const createMutation = useCreateStaffTableMutation(session);
	const {
		control,
		formState: { errors, isDirty, isSubmitting },
		handleSubmit,
		register,
		reset,
		setError,
		setFocus,
	} = useForm<TableFormValues>({
		defaultValues,
		mode: "onSubmit",
		resolver: zodResolver(tableFormSchema),
		shouldFocusError: false,
	});
	const values = useWatch({ control }) as TableFormValues;
	useStaffUnsavedChanges("new", isDirty);

	useEffect(() => {
		setDraft(
			readStaffTableDraft({
				userId,
				branchId,
				tableId: null,
				section: "new",
				valuesSchema: tableFormSchema,
			}),
		);
	}, [branchId, userId]);

	useEffect(() => {
		if (!isDirty) return;

		saveStaffTableDraft({
			userId,
			branchId,
			tableId: null,
			section: "new",
			baseUpdatedAt: null,
			values,
			valuesSchema: tableFormSchema,
		});
	}, [branchId, isDirty, userId, values]);

	async function handleValidSubmit(formValues: TableFormValues): Promise<void> {
		try {
			const table = await createMutation.mutateAsync({
				branchId,
				input: toCreateTableRequest(formValues),
			});
			removeStaffTableDraft(userId, branchId, null, "new");
			window.location.replace(
				`/staff/branches/${encodeURIComponent(branchId)}/tables/${encodeURIComponent(table.id)}?created=1`,
			);
		} catch (error) {
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

			toast.error(getCreateTableErrorMessage(error));
		}
	}

	function handleInvalidSubmit(formErrors: FieldErrors<TableFormValues>): void {
		const firstField = getFirstInvalidField(formErrors);
		if (firstField) setFocus(firstField);
	}

	function recoverDraft(): void {
		if (!draft) return;
		reset(draft.values, { keepDefaultValues: true });
		setDraft(null);
	}

	function discardDraft(): void {
		removeStaffTableDraft(userId, branchId, null, "new");
		setDraft(null);
	}

	return (
		<>
			<form
				className="space-y-7"
				noValidate
				onSubmit={(event) => {
					void handleSubmit(handleValidSubmit, handleInvalidSubmit)(event);
				}}
			>
				<FieldSet>
					<FieldDescription>
						Registra el código y la capacidad operativa de la mesa. Se creará
						inactiva.
					</FieldDescription>
					<FieldGroup className="grid gap-5 sm:grid-cols-2">
						<Field data-invalid={Boolean(errors.code)}>
							<FieldLabel htmlFor="table-code">Código</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.code)}
								id="table-code"
								placeholder="TERRAZA-02"
								{...register("code")}
							/>
							<FieldError errors={[errors.code]} />
						</Field>
						<Field data-invalid={Boolean(errors.capacity)}>
							<FieldLabel htmlFor="table-capacity">Capacidad</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.capacity)}
								id="table-capacity"
								min={1}
								type="number"
								{...register("capacity", { valueAsNumber: true })}
							/>
							<FieldError errors={[errors.capacity]} />
						</Field>
					</FieldGroup>
				</FieldSet>
				<Button
					disabled={isSubmitting || createMutation.isPending}
					type="submit"
				>
					{createMutation.isPending ? "Creando…" : "Crear mesa"}
				</Button>
			</form>

			<AlertDialog open={draft !== null} onOpenChange={() => undefined}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Encontramos un borrador</AlertDialogTitle>
						<AlertDialogDescription>
							Puedes recuperar los datos guardados o descartarlos.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={discardDraft}>
							Descartar
						</AlertDialogCancel>
						<AlertDialogAction onClick={recoverDraft}>
							Recuperar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function getFirstInvalidField(
	errors: FieldErrors<TableFormValues>,
): keyof TableFormValues | null {
	if (errors.code) return "code";
	if (errors.capacity) return "capacity";
	return null;
}

function getCreateTableErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		if (error.code === "FORBIDDEN") {
			return "No tienes permisos para crear mesas en esta sucursal.";
		}

		if (error.code === "BRANCH_NOT_FOUND") {
			return "La sucursal no existe o no está disponible.";
		}

		if (error.code === "NETWORK_ERROR" || error.status === 0) {
			return "No se pudo conectar con el servidor. Inténtalo nuevamente.";
		}
	}

	return "No se pudo crear la mesa. Inténtalo nuevamente.";
}
