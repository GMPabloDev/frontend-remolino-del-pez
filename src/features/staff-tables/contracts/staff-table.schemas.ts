import { z } from "zod";

export const tableStatusSchema = z.enum(["active", "inactive"]);
export const tableStatusFilterSchema = tableStatusSchema;

const tableCodePattern = /^[A-Za-z0-9_-]+$/;
const tableCodeInputSchema = z
	.string()
	.trim()
	.min(1, "Ingresa el código de la mesa.")
	.max(30, "El código no puede superar los 30 caracteres.")
	.refine((value) => tableCodePattern.test(value), {
		message:
			"El código solo puede contener letras, números, guiones y guiones bajos.",
	});

const tableCapacitySchema = z
	.number()
	.int("La capacidad debe ser un número entero.")
	.positive("La capacidad debe ser mayor que cero.");

export const staffTableSchema = z.object({
	id: z.uuid(),
	branchId: z.uuid(),
	code: z.string().trim().min(1).max(30),
	capacity: tableCapacitySchema,
	status: tableStatusSchema,
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
});

export const staffTablesSchema = z.array(staffTableSchema);

export const createTableRequestSchema = z.object({
	code: tableCodeInputSchema.transform((value) => value.toUpperCase()),
	capacity: tableCapacitySchema,
});

export const updateTableRequestSchema = z.object({
	code: tableCodeInputSchema.transform((value) => value.toUpperCase()),
	capacity: tableCapacitySchema,
});

export const updateTableStatusRequestSchema = z.object({
	status: tableStatusSchema,
});

export type TableStatus = z.infer<typeof tableStatusSchema>;
export type StaffTable = z.infer<typeof staffTableSchema>;
export type CreateTableRequest = z.infer<typeof createTableRequestSchema>;
export type UpdateTableRequest = z.infer<typeof updateTableRequestSchema>;
export type UpdateTableStatusRequest = z.infer<
	typeof updateTableStatusRequestSchema
>;
