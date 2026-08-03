import { z } from "zod";

import {
	createTableRequestSchema,
	tableStatusSchema,
	updateTableRequestSchema,
} from "./staff-table.schemas";

const tableCodeFormSchema = z
	.string()
	.trim()
	.min(1, "Ingresa el código de la mesa.")
	.max(30, "El código no puede superar los 30 caracteres.")
	.regex(
		/^[A-Za-z0-9_-]+$/,
		"El código solo puede contener letras, números, guiones y guiones bajos.",
	);

const tableCapacityFormSchema = z
	.number({ error: "Ingresa la capacidad de la mesa." })
	.int("La capacidad debe ser un número entero.")
	.positive("La capacidad debe ser mayor que cero.");

export const tableFormSchema = z.object({
	code: tableCodeFormSchema,
	capacity: tableCapacityFormSchema,
});

export const tableStatusFormSchema = z.object({
	status: tableStatusSchema,
});

export type TableFormValues = z.infer<typeof tableFormSchema>;
export type TableStatusFormValues = z.infer<typeof tableStatusFormSchema>;

export function toCreateTableRequest(values: TableFormValues) {
	return createTableRequestSchema.parse(values);
}

export function toUpdateTableRequest(values: TableFormValues) {
	return updateTableRequestSchema.parse(values);
}
