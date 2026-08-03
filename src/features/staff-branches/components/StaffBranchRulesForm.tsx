import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import {
	type FieldErrors,
	type UseFormRegisterReturn,
	useForm,
	useWatch,
} from "react-hook-form";
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
import type { StaffBranch } from "../contracts/staff-branch.schemas";
import {
	type BranchRulesFormValues,
	toUpdateBranchRulesRequest,
	updateBranchRulesFormSchema,
} from "../contracts/staff-branch-form.schemas";
import {
	hasBranchDraftConflict,
	readBranchDraft,
	removeBranchDraft,
	type StoredBranchDraft,
	saveBranchDraft,
} from "../lib/staff-branch-drafts";
import { useUpdateStaffBranchRulesMutation } from "../query/staff-branches-query";

interface StaffBranchRulesFormProps {
	branch: StaffBranch;
	session: StaffSessionAccess;
	userId: string;
}

export function StaffBranchRulesForm({
	branch,
	session,
	userId,
}: StaffBranchRulesFormProps) {
	const [draft, setDraft] =
		useState<StoredBranchDraft<BranchRulesFormValues> | null>(null);
	const updateMutation = useUpdateStaffBranchRulesMutation(session);
	const {
		control,
		formState: { errors, isDirty, isSubmitting },
		handleSubmit,
		register,
		reset,
		setError,
		setFocus,
	} = useForm<BranchRulesFormValues>({
		defaultValues: branch.rules,
		mode: "onSubmit",
		resolver: zodResolver(updateBranchRulesFormSchema),
		shouldFocusError: false,
	});
	const values = useWatch({ control }) as BranchRulesFormValues;
	const hasDraftConflict = draft
		? hasBranchDraftConflict(draft, branch.updatedAt)
		: false;
	useStaffUnsavedChanges("rules", isDirty);

	useEffect(() => {
		reset(branch.rules);
	}, [branch.rules, reset]);

	useEffect(() => {
		const storedDraft = readBranchDraft({
			userId,
			branchId: branch.id,
			section: "rules",
			valuesSchema: updateBranchRulesFormSchema,
		});
		setDraft(storedDraft);
	}, [branch.id, userId]);

	useEffect(() => {
		if (!isDirty) return;

		saveBranchDraft({
			userId,
			branchId: branch.id,
			section: "rules",
			baseUpdatedAt: branch.updatedAt,
			values,
			valuesSchema: updateBranchRulesFormSchema,
		});
	}, [branch.id, branch.updatedAt, isDirty, userId, values]);

	async function handleValidSubmit(values: BranchRulesFormValues) {
		try {
			const updatedBranch = await updateMutation.mutateAsync({
				branchId: branch.id,
				input: toUpdateBranchRulesRequest(values),
			});
			removeBranchDraft(userId, branch.id, "rules");
			setDraft(null);
			reset(updatedBranch.rules);
			toast.success("Las reglas de reserva fueron guardadas.");
		} catch (error) {
			setBranchError(error);
		}
	}

	function handleInvalidSubmit(formErrors: FieldErrors<BranchRulesFormValues>) {
		const firstField = getFirstInvalidField(formErrors);
		if (firstField) setFocus(firstField);
	}

	function recoverDraft(): void {
		if (!draft) return;
		reset(draft.values, { keepDefaultValues: true });
		setDraft(null);
	}

	function discardDraft(): void {
		removeBranchDraft(userId, branch.id, "rules");
		setDraft(null);
	}

	function setBranchError(error: unknown): void {
		if (error instanceof ApiClientError) {
			const field = getRuleErrorField(error);
			if (field) {
				setError(field, {
					message: error.details.find((detail) => detail.field.endsWith(field))
						?.message,
					type: "server",
				});
				setFocus(field);
				return;
			}

			if (error.code === "FORBIDDEN") {
				toast.error("No tienes permisos para editar estas reglas.");
				return;
			}
		}

		toast.error(
			error instanceof ApiClientError &&
				(error.code === "NETWORK_ERROR" || error.status === 0)
				? "No se pudo conectar con el servidor. Inténtalo nuevamente."
				: "No se pudieron guardar las reglas. Inténtalo nuevamente.",
		);
	}

	return (
		<section className="rounded-3xl border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.08)] sm:p-8">
			<div className="mb-8 space-y-3">
				<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e76832]">
					Reglas de reserva
				</p>
				<h3 className="font-heading text-2xl font-semibold tracking-[-0.04em]">
					Configuración operativa
				</h3>
				<FieldDescription>
					Estos valores se aplican a las reservas de esta sucursal.
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
					<FieldGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
						<NumberField
							error={errors.defaultReservationDurationMinutes}
							id="rules-duration"
							label="Duración predeterminada"
							registration={register("defaultReservationDurationMinutes", {
								valueAsNumber: true,
							})}
							suffix="minutos"
						/>
						<NumberField
							error={errors.minimumAdvanceMinutes}
							id="rules-minimum-advance"
							label="Anticipación mínima"
							registration={register("minimumAdvanceMinutes", {
								valueAsNumber: true,
							})}
							suffix="minutos"
						/>
						<NumberField
							error={errors.maximumAdvanceDays}
							id="rules-maximum-advance"
							label="Anticipación máxima"
							registration={register("maximumAdvanceDays", {
								valueAsNumber: true,
							})}
							suffix="días"
						/>
						<NumberField
							error={errors.arrivalToleranceMinutes}
							id="rules-tolerance"
							label="Tolerancia de llegada"
							registration={register("arrivalToleranceMinutes", {
								valueAsNumber: true,
							})}
							suffix="minutos"
						/>
						<NumberField
							error={errors.maxPartySize}
							id="rules-party-size"
							label="Grupo máximo"
							registration={register("maxPartySize", {
								valueAsNumber: true,
							})}
							suffix="personas"
						/>
					</FieldGroup>
				</FieldSet>

				<div className="flex justify-end border-t border-[#12324a]/10 pt-6">
					<Button
						className="h-11 min-w-40 rounded-xl"
						disabled={isSubmitting || !isDirty}
						type="submit"
					>
						{isSubmitting ? "Guardando…" : "Guardar reglas"}
					</Button>
				</div>
			</form>

			<AlertDialog open={draft !== null} onOpenChange={() => undefined}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{hasDraftConflict
								? "Las reglas tienen un borrador desactualizado"
								: "Encontramos un borrador de reglas"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{hasDraftConflict
								? "La sucursal cambió en el servidor desde que guardaste estas reglas. ¿Quieres reemplazar esos cambios?"
								: "Hay reglas de reserva que no terminaste de guardar. Puedes recuperarlas o descartarlas."}
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

function NumberField({
	error,
	id,
	label,
	registration,
	suffix,
}: {
	error?: { message?: string };
	id: string;
	label: string;
	registration: UseFormRegisterReturn;
	suffix: string;
}) {
	const errorId = `${id}-error`;

	return (
		<Field data-invalid={Boolean(error)}>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<div className="relative">
				<Input
					aria-describedby={error ? errorId : undefined}
					aria-invalid={Boolean(error)}
					className="pr-20"
					id={id}
					min={1}
					type="number"
					{...registration}
				/>
				<span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-xs text-[#12324a]/45">
					{suffix}
				</span>
			</div>
			<FieldError errors={error ? [error] : undefined} id={errorId} />
		</Field>
	);
}

function getFirstInvalidField(
	errors: FieldErrors<BranchRulesFormValues>,
): keyof BranchRulesFormValues | null {
	const fields: Array<keyof BranchRulesFormValues> = [
		"defaultReservationDurationMinutes",
		"minimumAdvanceMinutes",
		"maximumAdvanceDays",
		"arrivalToleranceMinutes",
		"maxPartySize",
	];

	return fields.find((field) => Boolean(errors[field])) ?? null;
}

function getRuleErrorField(
	error: ApiClientError,
): keyof BranchRulesFormValues | null {
	const fields: Array<keyof BranchRulesFormValues> = [
		"defaultReservationDurationMinutes",
		"minimumAdvanceMinutes",
		"maximumAdvanceDays",
		"arrivalToleranceMinutes",
		"maxPartySize",
	];

	if (error.code !== "VALIDATION_ERROR") return null;

	return (
		fields.find((field) =>
			error.details.some((detail) => detail.field.endsWith(field)),
		) ?? null
	);
}
