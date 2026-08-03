import { z } from "zod";

export const branchStatusSchema = z.enum(["active", "inactive"]);

const branchRulesFields = {
	defaultReservationDurationMinutes: z.number().int().positive(),
	minimumAdvanceMinutes: z.number().int().positive(),
	maximumAdvanceDays: z.number().int().positive(),
	arrivalToleranceMinutes: z.number().int().positive(),
	maxPartySize: z.number().int().positive(),
};

export const branchRulesSchema = z
	.object(branchRulesFields)
	.refine(
		(rules) => rules.minimumAdvanceMinutes < rules.maximumAdvanceDays * 24 * 60,
		{
			path: ["minimumAdvanceMinutes"],
			message: "Debe ser menor que la anticipación máxima.",
		},
	);

export const branchScheduleIntervalSchema = z
	.object({
		dayOfWeek: z.number().int().min(1).max(7),
		startTime: z
			.string()
			.regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Usa el formato HH:mm."),
		endTime: z
			.string()
			.regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Usa el formato HH:mm."),
	})
	.refine(
		(interval) =>
			timeToMinutes(interval.startTime) < timeToMinutes(interval.endTime),
		{
			path: ["startTime"],
			message: "La hora de inicio debe ser anterior a la hora de fin.",
		},
	);

export const staffBranchSchema = z.object({
	id: z.uuid(),
	restaurantId: z.uuid(),
	slug: z.string().trim().min(1),
	name: z.string().trim().min(1),
	code: z.string().trim().min(1),
	address: z.string().trim().min(1),
	district: z.string().trim().min(1),
	province: z.string().trim().min(1),
	department: z.string().trim().min(1),
	phone: z.string().trim().min(1),
	email: z.email().nullable(),
	status: branchStatusSchema,
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
	rules: branchRulesSchema,
	intervals: z.array(branchScheduleIntervalSchema),
});

export const staffBranchesSchema = z.array(staffBranchSchema);

export const createBranchRequestSchema = z
	.object({
		name: z.string().trim().min(1, "Ingresa el nombre de la sucursal."),
		code: z.string().trim().min(1, "Ingresa el código de la sucursal."),
		address: z.string().trim().min(1, "Ingresa la dirección."),
		district: z.string().trim().min(1, "Ingresa el distrito."),
		province: z.string().trim().min(1, "Ingresa la provincia."),
		department: z.string().trim().min(1, "Ingresa el departamento."),
		phone: z.string().trim().min(1, "Ingresa el teléfono."),
		email: z.preprocess(
			(value) =>
				typeof value === "string" && value.trim() === "" ? undefined : value,
			z.email("Ingresa un email válido.").optional(),
		),
		rules: branchRulesSchema,
	})
	.transform((input) => {
		const { email, ...details } = input;
		return email ? { ...details, email } : details;
	});

export const updateBranchDetailsRequestSchema = z.object({
	name: z.string().trim().min(1, "Ingresa el nombre de la sucursal."),
	code: z.string().trim().min(1, "Ingresa el código de la sucursal."),
	address: z.string().trim().min(1, "Ingresa la dirección."),
	district: z.string().trim().min(1, "Ingresa el distrito."),
	province: z.string().trim().min(1, "Ingresa la provincia."),
	department: z.string().trim().min(1, "Ingresa el departamento."),
	phone: z.string().trim().min(1, "Ingresa el teléfono."),
	email: z.email("Ingresa un email válido.").nullable(),
});

export const updateBranchRulesRequestSchema = z.object({
	rules: branchRulesSchema,
});

export const replaceBranchScheduleRequestSchema = z.object({
	intervals: z.array(branchScheduleIntervalSchema),
});

export const updateBranchStatusRequestSchema = z.object({
	status: branchStatusSchema,
});

export const branchStatusFilterSchema = z.enum(["active", "inactive"]);
export const branchDraftSectionSchema = z.enum([
	"new",
	"details",
	"rules",
	"schedule",
]);

export type BranchDraftSection = z.infer<typeof branchDraftSectionSchema>;
export type BranchStatus = z.infer<typeof branchStatusSchema>;
export type BranchRules = z.infer<typeof branchRulesSchema>;
export type BranchScheduleInterval = z.infer<
	typeof branchScheduleIntervalSchema
>;
export type StaffBranch = z.infer<typeof staffBranchSchema>;
export type CreateBranchRequest = z.infer<typeof createBranchRequestSchema>;
export type UpdateBranchDetailsRequest = z.infer<
	typeof updateBranchDetailsRequestSchema
>;
export type UpdateBranchRulesRequest = z.infer<
	typeof updateBranchRulesRequestSchema
>;
export type ReplaceBranchScheduleRequest = z.infer<
	typeof replaceBranchScheduleRequestSchema
>;
export type UpdateBranchStatusRequest = z.infer<
	typeof updateBranchStatusRequestSchema
>;

function timeToMinutes(value: string): number {
	const [hours, minutes] = value.split(":").map(Number);
	return hours * 60 + minutes;
}
