import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	type FieldErrors,
	type UseFormRegister,
	type UseFormRegisterReturn,
	useFieldArray,
	useForm,
} from "react-hook-form";

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
import { ApiClientError } from "@/lib/api/api-error";
import type {
	BranchScheduleInterval,
	StaffBranch,
} from "../contracts/staff-branch.schemas";
import {
	type BranchScheduleFormValues,
	branchScheduleFormSchema,
	toReplaceBranchScheduleRequest,
} from "../contracts/staff-branch-form.schemas";
import { removeBranchDraft } from "../lib/staff-branch-drafts";
import { useReplaceStaffBranchScheduleMutation } from "../query/staff-branches-query";

interface StaffBranchScheduleFormProps {
	branch: StaffBranch;
	session: StaffSessionAccess;
	userId: string;
}

const DAYS = [
	{ value: 1, label: "Lunes" },
	{ value: 2, label: "Martes" },
	{ value: 3, label: "Miércoles" },
	{ value: 4, label: "Jueves" },
	{ value: 5, label: "Viernes" },
	{ value: 6, label: "Sábado" },
	{ value: 7, label: "Domingo" },
] as const;

export function StaffBranchScheduleForm({
	branch,
	session,
	userId,
}: StaffBranchScheduleFormProps) {
	const errorReference = useRef<HTMLParagraphElement>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const replaceMutation = useReplaceStaffBranchScheduleMutation(session);
	const {
		control,
		formState: { errors, isDirty, isSubmitting },
		clearErrors,
		handleSubmit,
		register,
		reset,
		setError,
		setFocus,
	} = useForm<BranchScheduleFormValues>({
		defaultValues: getDefaultValues(branch),
		mode: "onSubmit",
		resolver: zodResolver(branchScheduleFormSchema),
		shouldFocusError: false,
	});
	const { append, fields, remove } = useFieldArray({
		control,
		name: "intervals",
	});
	const rootError = errors.root?.server?.message;

	useEffect(() => {
		reset(getDefaultValues(branch));
	}, [branch, reset]);

	useEffect(() => {
		if (rootError) errorReference.current?.focus();
	}, [rootError]);

	async function handleValidSubmit(values: BranchScheduleFormValues) {
		clearErrors("root");
		setSuccessMessage(null);

		if (branch.status === "active" && values.intervals.length === 0) {
			setError("root.server", {
				message:
					"Una sucursal activa debe conservar al menos un intervalo. Desactívala antes de dejarla sin horario.",
				type: "validation",
			});
			return;
		}

		try {
			const updatedBranch = await replaceMutation.mutateAsync({
				branchId: branch.id,
				input: toReplaceBranchScheduleRequest(values),
			});
			removeBranchDraft(userId, branch.id, "schedule");
			reset(getDefaultValues(updatedBranch));
			setSuccessMessage("El horario semanal fue guardado.");
		} catch (error) {
			setScheduleError(error);
		}
	}

	function handleInvalidSubmit(
		formErrors: FieldErrors<BranchScheduleFormValues>,
	) {
		clearErrors("root");
		setSuccessMessage(null);

		const firstField = getFirstInvalidField(formErrors);
		if (firstField) setFocus(firstField);
	}

	function setScheduleError(error: unknown): void {
		if (
			error instanceof ApiClientError &&
			error.code === "BRANCH_SCHEDULE_CONFLICT"
		) {
			setError("root.server", {
				message: "Hay intervalos solapados en el mismo día.",
				type: "server",
			});
			return;
		}

		if (
			error instanceof ApiClientError &&
			error.code === "BRANCH_SCHEDULE_REQUIRED"
		) {
			setError("root.server", {
				message:
					"La sucursal necesita al menos un intervalo para permanecer activa.",
				type: "server",
			});
			return;
		}

		setError("root.server", {
			message:
				error instanceof ApiClientError &&
				(error.code === "NETWORK_ERROR" || error.status === 0)
					? "No se pudo conectar con el servidor. Inténtalo nuevamente."
					: "No se pudo guardar el horario. Inténtalo nuevamente.",
			type: "server",
		});
	}

	return (
		<section className="rounded-3xl border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.08)] sm:p-8">
			<div className="mb-8 space-y-3">
				<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e76832]">
					Horario semanal
				</p>
				<h3 className="font-heading text-2xl font-semibold tracking-[-0.04em]">
					Horarios de atención
				</h3>
				<FieldDescription>
					Configura varios intervalos por día. Un día sin intervalos se
					considera cerrado.
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
				className="space-y-6"
				noValidate
				onSubmit={(event) => {
					void handleSubmit(handleValidSubmit, handleInvalidSubmit)(event);
				}}
			>
				<FieldSet>
					<FieldGroup className="gap-3">
						{DAYS.map((day) => (
							<ScheduleDay
								day={day}
								errors={errors}
								fields={fields}
								key={day.value}
								register={register}
								remove={remove}
								append={append}
							/>
						))}
					</FieldGroup>
				</FieldSet>

				<div className="flex justify-end border-t border-[#12324a]/10 pt-6">
					<Button
						className="h-11 min-w-40 rounded-xl"
						disabled={isSubmitting || !isDirty}
						type="submit"
					>
						{isSubmitting ? "Guardando…" : "Guardar horario"}
					</Button>
				</div>
			</form>
		</section>
	);
}

function ScheduleDay({
	append,
	day,
	errors,
	fields,
	register,
	remove,
}: {
	append: (value: BranchScheduleInterval) => void;
	day: (typeof DAYS)[number];
	errors: FieldErrors<BranchScheduleFormValues>;
	fields: Array<{
		id: string;
		dayOfWeek: number;
		startTime: string;
		endTime: string;
	}>;
	register: UseFormRegister<BranchScheduleFormValues>;
	remove: (index: number) => void;
}) {
	const dayFields = fields
		.map((field, index) => ({ field, index }))
		.filter(({ field }) => field.dayOfWeek === day.value);

	return (
		<div className="rounded-2xl border border-[#12324a]/10 bg-[#f4f0e8]/45 p-4 sm:p-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h4 className="font-semibold">{day.label}</h4>
					<p className="mt-1 text-xs text-[#12324a]/55">
						{dayFields.length === 0
							? "Día cerrado"
							: `${dayFields.length} ${dayFields.length === 1 ? "intervalo" : "intervalos"}`}
					</p>
				</div>
				<Button
					className="w-full rounded-xl sm:w-auto"
					onClick={() =>
						append({ dayOfWeek: day.value, startTime: "", endTime: "" })
					}
					type="button"
					variant="outline"
				>
					<Plus aria-hidden="true" />
					Añadir intervalo
				</Button>
			</div>

			{dayFields.length > 0 ? (
				<div className="mt-4 space-y-3">
					{dayFields.map(({ field, index }) => (
						<div
							className="grid gap-3 rounded-xl border border-[#12324a]/10 bg-white/80 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
							key={field.id}
						>
							<TimeField
								error={errors.intervals?.[index]?.startTime}
								id={`schedule-${day.value}-${index}-start`}
								label="Desde"
								registration={register(`intervals.${index}.startTime` as const)}
							/>
							<TimeField
								error={errors.intervals?.[index]?.endTime}
								id={`schedule-${day.value}-${index}-end`}
								label="Hasta"
								registration={register(`intervals.${index}.endTime` as const)}
							/>
							<Button
								aria-label={`Eliminar intervalo de ${day.label}`}
								className="h-10 w-full rounded-xl sm:w-10"
								onClick={() => remove(index)}
								type="button"
								variant="destructive"
							>
								<Trash2 aria-hidden="true" />
								<span className="sm:sr-only">Eliminar</span>
							</Button>
						</div>
					))}
				</div>
			) : null}
		</div>
	);
}

function TimeField({
	error,
	id,
	label,
	registration,
}: {
	error?: { message?: string };
	id: string;
	label: string;
	registration: UseFormRegisterReturn;
}) {
	const errorId = `${id}-error`;

	return (
		<Field data-invalid={Boolean(error)}>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Input
				aria-describedby={error ? errorId : undefined}
				aria-invalid={Boolean(error)}
				id={id}
				placeholder="HH:mm"
				type="time"
				{...registration}
			/>
			<FieldError errors={error ? [error] : undefined} id={errorId} />
		</Field>
	);
}

function getDefaultValues(branch: StaffBranch): BranchScheduleFormValues {
	return {
		intervals: [...branch.intervals].sort(compareIntervals),
	};
}

function compareIntervals(
	first: BranchScheduleInterval,
	second: BranchScheduleInterval,
): number {
	return (
		first.dayOfWeek - second.dayOfWeek ||
		first.startTime.localeCompare(second.startTime) ||
		first.endTime.localeCompare(second.endTime)
	);
}

function getFirstInvalidField(
	errors: FieldErrors<BranchScheduleFormValues>,
): `intervals.${number}.startTime` | `intervals.${number}.endTime` | null {
	for (const [index, error] of (errors.intervals ?? []).entries()) {
		if (error?.startTime) return `intervals.${index}.startTime`;
		if (error?.endTime) return `intervals.${index}.endTime`;
	}

	return null;
}
