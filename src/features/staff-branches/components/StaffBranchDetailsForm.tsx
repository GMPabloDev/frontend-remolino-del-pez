import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import {
	type FieldErrors,
	type UseFormRegisterReturn,
	useForm,
	useWatch,
} from "react-hook-form";

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
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { StaffSessionAccess } from "@/features/staff-auth/session/staff-session";
import { ApiClientError } from "@/lib/api/api-error";
import type { StaffBranch } from "../contracts/staff-branch.schemas";
import {
	type BranchDetailsFormValues,
	toUpdateBranchDetailsRequest,
	updateBranchDetailsFormSchema,
} from "../contracts/staff-branch-form.schemas";
import {
	hasBranchDraftConflict,
	readBranchDraft,
	removeBranchDraft,
	type StoredBranchDraft,
	saveBranchDraft,
} from "../lib/staff-branch-drafts";
import { useUpdateStaffBranchDetailsMutation } from "../query/staff-branches-query";
import { useStaffUnsavedChanges } from "./StaffUnsavedChangesProvider";

interface StaffBranchDetailsFormProps {
	branch: StaffBranch;
	session: StaffSessionAccess;
	userId: string;
}

export function StaffBranchDetailsForm({
	branch,
	session,
	userId,
}: StaffBranchDetailsFormProps) {
	const errorReference = useRef<HTMLParagraphElement>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [draft, setDraft] =
		useState<StoredBranchDraft<BranchDetailsFormValues> | null>(null);
	const updateMutation = useUpdateStaffBranchDetailsMutation(session);
	const {
		control,
		formState: { errors, isDirty, isSubmitting },
		clearErrors,
		handleSubmit,
		register,
		reset,
		setError,
		setFocus,
	} = useForm<BranchDetailsFormValues>({
		defaultValues: getDefaultValues(branch),
		mode: "onSubmit",
		resolver: zodResolver(updateBranchDetailsFormSchema),
		shouldFocusError: false,
	});
	const values = useWatch({ control }) as BranchDetailsFormValues;
	const rootError = errors.root?.server?.message;
	const hasDraftConflict = draft
		? hasBranchDraftConflict(draft, branch.updatedAt)
		: false;
	useStaffUnsavedChanges("details", isDirty);

	useEffect(() => {
		reset(getDefaultValues(branch));
	}, [branch, reset]);

	useEffect(() => {
		const storedDraft = readBranchDraft({
			userId,
			branchId: branch.id,
			section: "details",
			valuesSchema: updateBranchDetailsFormSchema,
		});
		setDraft(storedDraft);
	}, [branch.id, userId]);

	useEffect(() => {
		if (!isDirty) return;

		saveBranchDraft({
			userId,
			branchId: branch.id,
			section: "details",
			baseUpdatedAt: branch.updatedAt,
			values,
			valuesSchema: updateBranchDetailsFormSchema,
		});
	}, [branch.id, branch.updatedAt, isDirty, userId, values]);

	useEffect(() => {
		if (rootError) errorReference.current?.focus();
	}, [rootError]);

	async function handleValidSubmit(
		values: BranchDetailsFormValues,
	): Promise<void> {
		clearErrors("root");
		setSuccessMessage(null);

		try {
			const updatedBranch = await updateMutation.mutateAsync({
				branchId: branch.id,
				input: toUpdateBranchDetailsRequest(values),
			});
			removeBranchDraft(userId, branch.id, "details");
			setDraft(null);
			reset(getDefaultValues(updatedBranch));
			setSuccessMessage("Los datos generales fueron guardados.");
		} catch (error) {
			setBranchError(error);
		}
	}

	function handleInvalidSubmit(
		formErrors: FieldErrors<BranchDetailsFormValues>,
	) {
		clearErrors("root");
		setSuccessMessage(null);

		const firstField = getFirstInvalidField(formErrors);
		if (firstField) setFocus(firstField);
	}

	function recoverDraft(): void {
		if (!draft) return;
		reset(draft.values, { keepDefaultValues: true });
		setDraft(null);
	}

	function discardDraft(): void {
		removeBranchDraft(userId, branch.id, "details");
		setDraft(null);
	}

	function setBranchError(error: unknown): void {
		if (
			error instanceof ApiClientError &&
			error.code === "BRANCH_CODE_ALREADY_EXISTS"
		) {
			setError("code", {
				message: "Este código ya está registrado.",
				type: "server",
			});
			setFocus("code");
			return;
		}

		if (error instanceof ApiClientError && error.code === "FORBIDDEN") {
			setError("root.server", {
				message: "No tienes permisos para editar esta sucursal.",
				type: "server",
			});
			return;
		}

		setError("root.server", {
			message:
				error instanceof ApiClientError &&
				(error.code === "NETWORK_ERROR" || error.status === 0)
					? "No se pudo conectar con el servidor. Inténtalo nuevamente."
					: "No se pudieron guardar los datos generales. Inténtalo nuevamente.",
			type: "server",
		});
	}

	return (
		<section className="rounded-3xl border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.08)] sm:p-8">
			<div className="mb-8 space-y-3">
				<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e76832]">
					Datos generales
				</p>
				<h3 className="font-heading text-2xl font-semibold tracking-[-0.04em]">
					Información de la sucursal
				</h3>
				<FieldDescription>
					Actualiza los datos identificativos y de contacto sin modificar las
					reglas ni el horario.
				</FieldDescription>
			</div>

			{rootError ? (
				<p
					ref={errorReference}
					className="mb-6 rounded-xl border border-[#b34b25]/25 bg-[#b34b25]/10 px-4 py-3 text-sm leading-6 text-[#8f3d20] outline-none"
					role="alert"
					tabIndex={-1}
				>
					{rootError}
				</p>
			) : null}
			{successMessage ? (
				<p
					className="mb-6 rounded-xl border border-[#338faa]/25 bg-[#dcecef] px-4 py-3 text-sm leading-6 text-[#12324a]"
					role="status"
				>
					{successMessage}
				</p>
			) : null}

			<form
				className="space-y-7"
				noValidate
				onSubmit={(event) => {
					void handleSubmit(handleValidSubmit, handleInvalidSubmit)(event);
				}}
			>
				<FieldSet>
					<FieldLegend className="sr-only">Datos generales</FieldLegend>
					<FieldGroup className="grid gap-5 md:grid-cols-2">
						<TextField
							error={errors.name}
							id="details-branch-name"
							label="Nombre"
							registration={register("name")}
							placeholder="Sucursal Miraflores"
						/>
						<TextField
							error={errors.code}
							id="details-branch-code"
							label="Código"
							registration={register("code")}
							placeholder="MIRAFLORES"
						/>
						<TextField
							className="md:col-span-2"
							error={errors.address}
							id="details-branch-address"
							label="Dirección"
							registration={register("address")}
							placeholder="Av. Larco 123"
						/>
						<TextField
							error={errors.district}
							id="details-branch-district"
							label="Distrito"
							registration={register("district")}
							placeholder="Miraflores"
						/>
						<TextField
							error={errors.province}
							id="details-branch-province"
							label="Provincia"
							registration={register("province")}
							placeholder="Lima"
						/>
						<TextField
							error={errors.department}
							id="details-branch-department"
							label="Departamento"
							registration={register("department")}
							placeholder="Lima"
						/>
						<TextField
							error={errors.phone}
							id="details-branch-phone"
							label="Teléfono"
							registration={register("phone")}
							placeholder="999 111 222"
							type="tel"
						/>
						<TextField
							error={errors.email}
							id="details-branch-email"
							label="Email"
							registration={register("email")}
							placeholder="sucursal@restaurante.com"
							type="email"
						/>
					</FieldGroup>
				</FieldSet>

				<div className="flex justify-end border-t border-[#12324a]/10 pt-6">
					<Button
						className="h-11 min-w-40 rounded-xl"
						disabled={isSubmitting || !isDirty}
						type="submit"
					>
						{isSubmitting ? "Guardando…" : "Guardar datos"}
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
								? "La sucursal cambió en el servidor desde que guardaste este borrador. ¿Quieres reemplazar esos cambios con tu versión?"
								: "Hay datos generales que no terminaste de guardar. Puedes recuperarlos o empezar con los datos actuales."}
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

function TextField({
	error,
	id,
	label,
	registration,
	placeholder,
	type = "text",
	className,
}: {
	error?: { message?: string };
	id: string;
	label: string;
	registration: UseFormRegisterReturn;
	placeholder: string;
	type?: string;
	className?: string;
}) {
	const errorId = `${id}-error`;

	return (
		<Field className={className} data-invalid={Boolean(error)}>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Input
				aria-describedby={error ? errorId : undefined}
				aria-invalid={Boolean(error)}
				id={id}
				placeholder={placeholder}
				type={type}
				{...registration}
			/>
			<FieldError errors={error ? [error] : undefined} id={errorId} />
		</Field>
	);
}

function getDefaultValues(branch: StaffBranch): BranchDetailsFormValues {
	return {
		name: branch.name,
		code: branch.code,
		address: branch.address,
		district: branch.district,
		province: branch.province,
		department: branch.department,
		phone: branch.phone,
		email: branch.email ?? "",
	};
}

function getFirstInvalidField(
	errors: FieldErrors<BranchDetailsFormValues>,
): keyof BranchDetailsFormValues | null {
	const fields: Array<keyof BranchDetailsFormValues> = [
		"name",
		"code",
		"address",
		"district",
		"province",
		"department",
		"phone",
		"email",
	];

	return fields.find((field) => Boolean(errors[field])) ?? null;
}
