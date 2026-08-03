import { z } from "zod";

import {
	type BranchRules,
	branchRulesSchema,
	branchScheduleIntervalSchema,
	type CreateBranchRequest,
	createBranchRequestSchema,
	type ReplaceBranchScheduleRequest,
	replaceBranchScheduleRequestSchema,
	type UpdateBranchDetailsRequest,
	updateBranchDetailsRequestSchema,
	updateBranchRulesRequestSchema,
} from "./staff-branch.schemas";

export const DEFAULT_BRANCH_RULES: BranchRules = {
	defaultReservationDurationMinutes: 60,
	minimumAdvanceMinutes: 60,
	maximumAdvanceDays: 30,
	arrivalToleranceMinutes: 15,
	maxPartySize: 12,
};

const branchDetailsFormFields = {
	name: z.string().trim().min(1, "Ingresa el nombre de la sucursal."),
	code: z.string().trim().min(1, "Ingresa el código de la sucursal."),
	address: z.string().trim().min(1, "Ingresa la dirección."),
	district: z.string().trim().min(1, "Ingresa el distrito."),
	province: z.string().trim().min(1, "Ingresa la provincia."),
	department: z.string().trim().min(1, "Ingresa el departamento."),
	phone: z.string().trim().min(1, "Ingresa el teléfono."),
	email: z
		.string()
		.trim()
		.refine(
			(value) => value === "" || z.email().safeParse(value).success,
			"Ingresa un email válido.",
		),
};

export const branchDetailsFormSchema = z.object(branchDetailsFormFields);
export const branchRulesFormSchema = branchRulesSchema;

export const createBranchFormSchema = z.object({
	...branchDetailsFormFields,
	rules: branchRulesFormSchema,
});

export const updateBranchDetailsFormSchema = branchDetailsFormSchema;
export const updateBranchRulesFormSchema = branchRulesFormSchema;

export const branchScheduleFormSchema = z
	.object({
		intervals: z.array(branchScheduleIntervalSchema),
	})
	.superRefine((schedule, context) => {
		const intervalsByDay = new Map<
			number,
			Array<{ index: number; start: number; end: number }>
		>();

		for (const [index, interval] of schedule.intervals.entries()) {
			const start = timeToMinutes(interval.startTime);
			const end = timeToMinutes(interval.endTime);
			if (!Number.isFinite(start) || !Number.isFinite(end)) continue;

			const dayIntervals = intervalsByDay.get(interval.dayOfWeek) ?? [];
			dayIntervals.push({ index, start, end });
			intervalsByDay.set(interval.dayOfWeek, dayIntervals);
		}

		for (const dayIntervals of intervalsByDay.values()) {
			const sortedIntervals = [...dayIntervals].sort(
				(first, second) => first.start - second.start,
			);

			for (let index = 1; index < sortedIntervals.length; index += 1) {
				const previous = sortedIntervals[index - 1];
				const current = sortedIntervals[index];
				if (current.start < previous.end) {
					context.addIssue({
						code: "custom",
						path: ["intervals", current.index, "startTime"],
						message: "Este intervalo se solapa con otro del mismo día.",
					});
				}
			}
		}
	});

export type BranchDetailsFormValues = z.infer<typeof branchDetailsFormSchema>;
export type BranchRulesFormValues = z.infer<typeof branchRulesFormSchema>;
export type CreateBranchFormValues = z.infer<typeof createBranchFormSchema>;
export type BranchScheduleFormValues = z.infer<typeof branchScheduleFormSchema>;

export function toCreateBranchRequest(
	values: CreateBranchFormValues,
): CreateBranchRequest {
	return createBranchRequestSchema.parse({
		...values,
		email: normalizeCreateEmail(values.email),
	});
}

export function toUpdateBranchDetailsRequest(
	values: BranchDetailsFormValues,
): UpdateBranchDetailsRequest {
	return updateBranchDetailsRequestSchema.parse({
		...values,
		email: normalizeUpdateEmail(values.email),
	});
}

export function toUpdateBranchRulesRequest(
	values: BranchRulesFormValues,
): BranchRules {
	const payload = updateBranchRulesRequestSchema.parse({ rules: values });
	return payload.rules;
}

export function toReplaceBranchScheduleRequest(
	values: BranchScheduleFormValues,
): ReplaceBranchScheduleRequest {
	return replaceBranchScheduleRequestSchema.parse({
		intervals: [...values.intervals].sort(compareIntervals),
	});
}

function normalizeCreateEmail(email: string): string | undefined {
	const normalizedEmail = email.trim();
	return normalizedEmail === "" ? undefined : normalizedEmail;
}

function normalizeUpdateEmail(email: string): string | null {
	const normalizedEmail = email.trim();
	return normalizedEmail === "" ? null : normalizedEmail;
}

function compareIntervals(
	first: BranchScheduleFormValues["intervals"][number],
	second: BranchScheduleFormValues["intervals"][number],
): number {
	return (
		first.dayOfWeek - second.dayOfWeek ||
		first.startTime.localeCompare(second.startTime) ||
		first.endTime.localeCompare(second.endTime)
	);
}

function timeToMinutes(value: string): number {
	const [hours, minutes] = value.split(":").map(Number);
	return hours * 60 + minutes;
}
