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
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useStaffUnsavedChanges } from "@/features/staff-shell/components/StaffUnsavedChangesProvider";
import { ApiClientError } from "@/lib/api/api-error";
import type { StaffBranchesClient } from "../api/staff-branches-client";
import {
	type CreateBranchFormValues,
	createBranchFormSchema,
	DEFAULT_BRANCH_RULES,
	toCreateBranchRequest,
} from "../contracts/staff-branch-form.schemas";
import {
	readBranchDraft,
	removeBranchDraft,
	type StoredBranchDraft,
	saveBranchDraft,
} from "../lib/staff-branch-drafts";

interface StaffBranchCreateFormProps {
	userId: string;
	client: StaffBranchesClient;
}

const defaultValues: CreateBranchFormValues = {
	name: "",
	code: "",
	address: "",
	district: "",
	province: "",
	department: "",
	phone: "",
	email: "",
	rules: DEFAULT_BRANCH_RULES,
};

export function StaffBranchCreateForm({
	userId,
	client,
}: StaffBranchCreateFormProps) {
	const [draft, setDraft] =
		useState<StoredBranchDraft<CreateBranchFormValues> | null>(null);
	const {
		control,
		formState: { errors, isDirty, isSubmitting },
		handleSubmit,
		register,
		reset,
		setError,
		setFocus,
	} = useForm<CreateBranchFormValues>({
		defaultValues,
		mode: "onSubmit",
		resolver: zodResolver(createBranchFormSchema),
		shouldFocusError: false,
	});
	const values = useWatch({ control }) as CreateBranchFormValues;
	useStaffUnsavedChanges("new", isDirty);

	useEffect(() => {
		const storedDraft = readBranchDraft({
			userId,
			branchId: null,
			section: "new",
			valuesSchema: createBranchFormSchema,
		});
		setDraft(storedDraft);
	}, [userId]);

	useEffect(() => {
		if (!isDirty) return;

		saveBranchDraft({
			userId,
			branchId: null,
			section: "new",
			baseUpdatedAt: null,
			values,
			valuesSchema: createBranchFormSchema,
		});
	}, [isDirty, userId, values]);

	async function handleValidSubmit(
		formValues: CreateBranchFormValues,
	): Promise<void> {
		try {
			const branch = await client.createBranch(
				toCreateBranchRequest(formValues),
			);
			removeBranchDraft(userId, null, "new");
			window.location.replace(`/staff/branches/${branch.id}?created=1`);
		} catch (error) {
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

			toast.error(getCreateBranchErrorMessage(error));
		}
	}

	function handleInvalidSubmit(
		formErrors: FieldErrors<CreateBranchFormValues>,
	) {
		const firstField = getFirstInvalidField(formErrors);
		if (firstField) setFocus(firstField);
	}

	function recoverDraft() {
		if (!draft) return;
		reset(draft.values, { keepDefaultValues: true });
		setDraft(null);
	}

	function discardDraft() {
		removeBranchDraft(userId, null, "new");
		setDraft(null);
	}

	return (
		<>
			<form
				className="space-y-8"
				noValidate
				onSubmit={(event) => {
					void handleSubmit(handleValidSubmit, handleInvalidSubmit)(event);
				}}
			>
				<FieldSet>
					<FieldLegend>Datos de la sucursal</FieldLegend>
					<FieldDescription>
						Estos datos serán visibles para el equipo y los clientes del
						restaurante.
					</FieldDescription>
					<FieldGroup className="grid gap-5 md:grid-cols-2">
						<TextField
							error={errors.name}
							id="branch-name"
							label="Nombre"
							registration={register("name")}
							placeholder="Sucursal Miraflores"
						/>
						<TextField
							error={errors.code}
							id="branch-code"
							label="Código"
							registration={register("code")}
							placeholder="MIRAFLORES"
						/>
						<TextField
							className="md:col-span-2"
							error={errors.address}
							id="branch-address"
							label="Dirección"
							registration={register("address")}
							placeholder="Av. Larco 123"
						/>
						<TextField
							error={errors.district}
							id="branch-district"
							label="Distrito"
							registration={register("district")}
							placeholder="Miraflores"
						/>
						<TextField
							error={errors.province}
							id="branch-province"
							label="Provincia"
							registration={register("province")}
							placeholder="Lima"
						/>
						<TextField
							error={errors.department}
							id="branch-department"
							label="Departamento"
							registration={register("department")}
							placeholder="Lima"
						/>
						<TextField
							error={errors.phone}
							id="branch-phone"
							label="Teléfono"
							registration={register("phone")}
							placeholder="999 111 222"
							type="tel"
						/>
						<TextField
							error={errors.email}
							id="branch-email"
							label="Email"
							registration={register("email")}
							placeholder="sucursal@restaurante.com"
							type="email"
						/>
					</FieldGroup>
				</FieldSet>

				<FieldSet>
					<FieldLegend>Reglas de reserva</FieldLegend>
					<FieldDescription>
						Definen los límites operativos con los que se podrán solicitar
						reservas en esta sucursal.
					</FieldDescription>
					<FieldGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
						<NumberField
							error={errors.rules?.defaultReservationDurationMinutes}
							id="branch-duration"
							label="Duración predeterminada"
							registration={register(
								"rules.defaultReservationDurationMinutes",
								{ valueAsNumber: true },
							)}
							suffix="minutos"
						/>
						<NumberField
							error={errors.rules?.minimumAdvanceMinutes}
							id="branch-minimum-advance"
							label="Anticipación mínima"
							registration={register("rules.minimumAdvanceMinutes", {
								valueAsNumber: true,
							})}
							suffix="minutos"
						/>
						<NumberField
							error={errors.rules?.maximumAdvanceDays}
							id="branch-maximum-advance"
							label="Anticipación máxima"
							registration={register("rules.maximumAdvanceDays", {
								valueAsNumber: true,
							})}
							suffix="días"
						/>
						<NumberField
							error={errors.rules?.arrivalToleranceMinutes}
							id="branch-tolerance"
							label="Tolerancia de llegada"
							registration={register("rules.arrivalToleranceMinutes", {
								valueAsNumber: true,
							})}
							suffix="minutos"
						/>
						<NumberField
							error={errors.rules?.maxPartySize}
							id="branch-party-size"
							label="Grupo máximo"
							registration={register("rules.maxPartySize", {
								valueAsNumber: true,
							})}
							suffix="personas"
						/>
					</FieldGroup>
				</FieldSet>

				<div className="flex justify-end border-t border-[#12324a]/10 pt-6">
					<Button
						className="h-12 min-w-44 rounded-xl"
						disabled={isSubmitting}
						type="submit"
					>
						{isSubmitting ? "Creando…" : "Crear sucursal"}
					</Button>
				</div>
			</form>

			<AlertDialog open={Boolean(draft)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Encontramos un borrador</AlertDialogTitle>
						<AlertDialogDescription>
							Hay datos de una sucursal que no terminaste de guardar. Puedes
							recuperarlos o empezar un formulario nuevo.
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
		</>
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
	serverError?: boolean;
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
	errors: FieldErrors<CreateBranchFormValues>,
):
	| keyof CreateBranchFormValues
	| `rules.${keyof typeof DEFAULT_BRANCH_RULES}`
	| null {
	const details: Array<keyof CreateBranchFormValues> = [
		"name",
		"code",
		"address",
		"district",
		"province",
		"department",
		"phone",
		"email",
	];
	const firstDetail = details.find((field) => Boolean(errors[field]));
	if (firstDetail) return firstDetail;

	const ruleFields = Object.keys(DEFAULT_BRANCH_RULES) as Array<
		keyof typeof DEFAULT_BRANCH_RULES
	>;
	const firstRule = ruleFields.find((field) => Boolean(errors.rules?.[field]));
	return firstRule ? `rules.${firstRule}` : null;
}

function getCreateBranchErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		if (error.code === "NETWORK_ERROR" || error.status === 0) {
			return "No se pudo conectar con el servidor. Inténtalo nuevamente.";
		}

		if (error.code === "FORBIDDEN") {
			return "No tienes permisos para crear sucursales.";
		}
	}

	return "No se pudo crear la sucursal. Inténtalo nuevamente.";
}
