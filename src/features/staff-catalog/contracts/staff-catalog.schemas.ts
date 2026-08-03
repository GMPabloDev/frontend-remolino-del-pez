import { z } from "zod";

export const catalogStatusSchema = z.enum(["active", "inactive"]);
export const catalogStatusFilterSchema = catalogStatusSchema;

const httpImageUrlSchema = z
	.string()
	.trim()
	.max(2048, "La URL de imagen no puede superar 2048 caracteres.")
	.refine((value) => {
		try {
			const url = new URL(value);
			return url.protocol === "http:" || url.protocol === "https:";
		} catch {
			return false;
		}
	}, "Ingresa una URL http o https válida.");

const positionSchema = z.number().int().positive();
const ingredientSchema = z.string().trim().min(1).max(100);
const ingredientsSchema = z.array(ingredientSchema).max(50);
const allergensSchema = z.array(ingredientSchema).max(30);

export const menuCategorySchema = z.object({
	id: z.uuid(),
	restaurantId: z.uuid(),
	name: z.string().trim().min(1).max(80),
	position: positionSchema,
	status: catalogStatusSchema,
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
});

export const menuCategoriesSchema = z.array(menuCategorySchema);

export const dishSchema = z.object({
	id: z.uuid(),
	restaurantId: z.uuid(),
	categoryId: z.uuid(),
	categoryName: z.string().trim().min(1),
	name: z.string().trim().min(1).max(120),
	description: z.string().trim().min(1).max(1000),
	imageUrl: httpImageUrlSchema.nullable(),
	ingredients: ingredientsSchema,
	allergens: allergensSchema,
	position: positionSchema,
	status: catalogStatusSchema,
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
});

export const dishesSchema = z.array(dishSchema);

export const branchDishStatusSchema = z.enum([
	"available",
	"sold_out",
	"inactive",
]);

const branchDishPriceSchema = z
	.string()
	.regex(/^\d{1,8}\.\d{2}$/, "Usa un precio con dos decimales.")
	.refine((value) => Number(value) > 0, "El precio debe ser mayor que 0.00.");

export const branchDishConfigurationSchema = z.object({
	price: branchDishPriceSchema,
	status: branchDishStatusSchema,
});

export const branchDishSchema = dishSchema.extend({
	branchConfiguration: branchDishConfigurationSchema.nullable(),
});

export const branchDishesSchema = z.array(branchDishSchema);

export const createMenuCategoryRequestSchema = z.object({
	name: z.string().trim().min(1).max(80),
	position: positionSchema,
});

export const updateMenuCategoryRequestSchema = createMenuCategoryRequestSchema;

export const updateMenuCategoryStatusRequestSchema = z.object({
	status: catalogStatusSchema,
});

export const createDishRequestSchema = z.object({
	name: z.string().trim().min(1).max(120),
	description: z.string().trim().min(1).max(1000),
	imageUrl: httpImageUrlSchema.optional(),
	ingredients: ingredientsSchema,
	allergens: allergensSchema,
	categoryId: z.uuid(),
	position: positionSchema,
});

export const updateDishRequestSchema = z.object({
	name: z.string().trim().min(1).max(120),
	description: z.string().trim().min(1).max(1000),
	imageUrl: httpImageUrlSchema.nullable(),
	ingredients: ingredientsSchema,
	allergens: allergensSchema,
	categoryId: z.uuid(),
	position: positionSchema,
});

export const updateDishStatusRequestSchema = z.object({
	status: catalogStatusSchema,
});

export const replaceBranchDishConfigurationRequestSchema =
	branchDishConfigurationSchema;

export type CatalogStatus = z.infer<typeof catalogStatusSchema>;
export type MenuCategory = z.infer<typeof menuCategorySchema>;
export type StaffDish = z.infer<typeof dishSchema>;
export type BranchDishStatus = z.infer<typeof branchDishStatusSchema>;
export type BranchDishConfiguration = z.infer<
	typeof branchDishConfigurationSchema
>;
export type StaffBranchDish = z.infer<typeof branchDishSchema>;
export type CreateMenuCategoryRequest = z.infer<
	typeof createMenuCategoryRequestSchema
>;
export type UpdateMenuCategoryRequest = z.infer<
	typeof updateMenuCategoryRequestSchema
>;
export type CreateDishRequest = z.infer<typeof createDishRequestSchema>;
export type UpdateDishRequest = z.infer<typeof updateDishRequestSchema>;
export type ReplaceBranchDishConfigurationRequest = z.infer<
	typeof replaceBranchDishConfigurationRequestSchema
>;
