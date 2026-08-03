import { z } from "zod";

import {
	type BranchRules,
	branchRulesSchema,
	type CreateBranchRequest,
	createBranchRequestSchema,
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

export type BranchDetailsFormValues = z.infer<typeof branchDetailsFormSchema>;
export type BranchRulesFormValues = z.infer<typeof branchRulesFormSchema>;
export type CreateBranchFormValues = z.infer<typeof createBranchFormSchema>;

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

function normalizeCreateEmail(email: string): string | undefined {
	const normalizedEmail = email.trim();
	return normalizedEmail === "" ? undefined : normalizedEmail;
}

function normalizeUpdateEmail(email: string): string | null {
	const normalizedEmail = email.trim();
	return normalizedEmail === "" ? null : normalizedEmail;
}
