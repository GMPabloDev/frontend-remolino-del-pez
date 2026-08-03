import { z } from "zod";

import {
	branchDishStatusSchema,
	type CreateDishRequest,
	type CreateMenuCategoryRequest,
	createDishRequestSchema,
	createMenuCategoryRequestSchema,
	type ReplaceBranchDishConfigurationRequest,
	replaceBranchDishConfigurationRequestSchema,
	type UpdateDishRequest,
	type UpdateMenuCategoryRequest,
	updateDishRequestSchema,
	updateMenuCategoryRequestSchema,
} from "./staff-catalog.schemas";

const positionFormSchema = z
	.number({ error: "Ingresa una posición." })
	.int("La posición debe ser un número entero.")
	.positive("La posición debe ser mayor que cero.");

const nameFormSchema = z.string().trim().min(1, "Ingresa un nombre.");

const stringListFormSchema = (max: number, label: string) =>
	z
		.array(
			z
				.string()
				.trim()
				.min(1, `Ingresa un elemento válido en ${label}.`)
				.max(100, `Cada elemento de ${label} no puede superar 100 caracteres.`),
		)
		.max(max, `${label} no puede superar ${max} elementos.`)
		.superRefine((values, context) => {
			const normalizedValues = new Set<string>();

			for (const [index, value] of values.entries()) {
				const normalizedValue = value.trim().toLocaleLowerCase();
				if (normalizedValues.has(normalizedValue)) {
					context.addIssue({
						code: "custom",
						path: [index],
						message: "No repitas elementos sin distinguir mayúsculas.",
					});
				}
				normalizedValues.add(normalizedValue);
			}
		});

const imageUrlFormSchema = z
	.string()
	.trim()
	.refine(
		(value) =>
			value === "" ||
			createDishRequestSchema.shape.imageUrl.safeParse(value).success,
		"Ingresa una URL http o https válida.",
	);

export const categoryFormSchema = z.object({
	name: nameFormSchema.max(80, "El nombre no puede superar 80 caracteres."),
	position: positionFormSchema,
});

export const dishFormSchema = z.object({
	name: nameFormSchema.max(120, "El nombre no puede superar 120 caracteres."),
	description: z
		.string()
		.trim()
		.min(1, "Ingresa una descripción.")
		.max(1000, "La descripción no puede superar 1000 caracteres."),
	imageUrl: imageUrlFormSchema,
	ingredients: stringListFormSchema(50, "los ingredientes"),
	allergens: stringListFormSchema(30, "los alérgenos"),
	categoryId: z.uuid("Selecciona una categoría válida."),
	position: positionFormSchema,
});

export const branchDishConfigurationFormSchema = z.object({
	price: z
		.string()
		.trim()
		.regex(/^\d{1,8}\.\d{2}$/, "Usa un precio con exactamente dos decimales.")
		.refine((value) => Number(value) > 0, "El precio debe ser mayor que 0.00."),
	status: branchDishStatusSchema,
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
export type DishFormValues = z.infer<typeof dishFormSchema>;
export type BranchDishConfigurationFormValues = z.infer<
	typeof branchDishConfigurationFormSchema
>;

export function toCreateMenuCategoryRequest(
	values: CategoryFormValues,
): CreateMenuCategoryRequest {
	return createMenuCategoryRequestSchema.parse(values);
}

export function toUpdateMenuCategoryRequest(
	values: CategoryFormValues,
): UpdateMenuCategoryRequest {
	return updateMenuCategoryRequestSchema.parse(values);
}

export function toCreateDishRequest(values: DishFormValues): CreateDishRequest {
	const parsed = createDishRequestSchema.parse({
		...values,
		imageUrl: normalizeCreateImageUrl(values.imageUrl),
	});
	return normalizeStringLists(parsed);
}

export function toUpdateDishRequest(values: DishFormValues): UpdateDishRequest {
	const parsed = updateDishRequestSchema.parse({
		...values,
		imageUrl: normalizeUpdateImageUrl(values.imageUrl),
	});
	return normalizeStringLists(parsed);
}

export function toReplaceBranchDishConfigurationRequest(
	values: BranchDishConfigurationFormValues,
): ReplaceBranchDishConfigurationRequest {
	return replaceBranchDishConfigurationRequestSchema.parse(values);
}

function normalizeCreateImageUrl(value: string): string | undefined {
	const normalizedValue = value.trim();
	return normalizedValue === "" ? undefined : normalizedValue;
}

function normalizeUpdateImageUrl(value: string): string | null {
	const normalizedValue = value.trim();
	return normalizedValue === "" ? null : normalizedValue;
}

function normalizeStringLists<T extends CreateDishRequest | UpdateDishRequest>(
	values: T,
): T {
	return {
		...values,
		ingredients: values.ingredients.map((value) => value.trim()),
		allergens: values.allergens.map((value) => value.trim()),
	};
}
