import { getStaffRuntimeConfig } from "@/config/runtime";
import { createStaffApiClient } from "@/features/staff-auth/api/staff-api-client";
import type { StaffSessionAccess } from "@/features/staff-auth/session/staff-session";
import {
	branchDishConfigurationSchema,
	branchDishesSchema,
	type CatalogStatus,
	type CreateDishRequest,
	type CreateMenuCategoryRequest,
	catalogStatusSchema,
	createDishRequestSchema,
	createMenuCategoryRequestSchema,
	dishSchema,
	type MenuCategory,
	menuCategoriesSchema,
	menuCategorySchema,
	type ReplaceBranchDishConfigurationRequest,
	replaceBranchDishConfigurationRequestSchema,
	type StaffBranchDish,
	type StaffDish,
	type UpdateDishRequest,
	type UpdateMenuCategoryRequest,
	updateDishRequestSchema,
	updateDishStatusRequestSchema,
	updateMenuCategoryRequestSchema,
	updateMenuCategoryStatusRequestSchema,
} from "../contracts/staff-catalog.schemas";

export interface StaffCatalogClient {
	listCategories(status?: CatalogStatus): Promise<MenuCategory[]>;
	getCategory(categoryId: string): Promise<MenuCategory>;
	createCategory(input: CreateMenuCategoryRequest): Promise<MenuCategory>;
	updateCategory(
		categoryId: string,
		input: UpdateMenuCategoryRequest,
	): Promise<MenuCategory>;
	updateCategoryStatus(
		categoryId: string,
		status: CatalogStatus,
	): Promise<MenuCategory>;
	listDishes(status?: CatalogStatus): Promise<StaffDish[]>;
	getDish(dishId: string): Promise<StaffDish>;
	createDish(input: CreateDishRequest): Promise<StaffDish>;
	updateDish(dishId: string, input: UpdateDishRequest): Promise<StaffDish>;
	updateDishStatus(dishId: string, status: CatalogStatus): Promise<StaffDish>;
	listBranchDishes(branchId: string): Promise<StaffBranchDish[]>;
	updateBranchDishConfiguration(
		branchId: string,
		dishId: string,
		input: ReplaceBranchDishConfigurationRequest,
	): Promise<StaffBranchDish["branchConfiguration"]>;
}

export function createStaffCatalogClient(
	session: StaffSessionAccess,
): StaffCatalogClient {
	const { restaurantId } = getStaffRuntimeConfig();
	const apiClient = createStaffApiClient(session);
	const categoriesPath = `/restaurants/${restaurantId}/menu/categories`;
	const dishesPath = `/restaurants/${restaurantId}/menu/dishes`;
	const branchDishesPath = (branchId: string) =>
		`/restaurants/${restaurantId}/branches/${encodeURIComponent(branchId)}/dishes`;

	return {
		listCategories: (status) =>
			apiClient.request(
				`${categoriesPath}${createStatusQuery(status)}`,
				menuCategoriesSchema,
				{ method: "GET" },
			),
		getCategory: (categoryId) =>
			apiClient.request(
				`${categoriesPath}/${encodeURIComponent(categoryId)}`,
				menuCategorySchema,
				{ method: "GET" },
			),
		createCategory: (input) =>
			apiClient.request(
				categoriesPath,
				menuCategorySchema,
				createJsonRequest("POST", createMenuCategoryRequestSchema.parse(input)),
			),
		updateCategory: (categoryId, input) =>
			apiClient.request(
				`${categoriesPath}/${encodeURIComponent(categoryId)}`,
				menuCategorySchema,
				createJsonRequest(
					"PATCH",
					updateMenuCategoryRequestSchema.parse(input),
				),
			),
		updateCategoryStatus: (categoryId, status) =>
			apiClient.request(
				`${categoriesPath}/${encodeURIComponent(categoryId)}/status`,
				menuCategorySchema,
				createJsonRequest(
					"PATCH",
					updateMenuCategoryStatusRequestSchema.parse({ status }),
				),
			),
		listDishes: (status) =>
			apiClient.request(
				`${dishesPath}${createStatusQuery(status)}`,
				dishesSchema,
				{ method: "GET" },
			),
		getDish: (dishId) =>
			apiClient.request(
				`${dishesPath}/${encodeURIComponent(dishId)}`,
				dishSchema,
				{ method: "GET" },
			),
		createDish: (input) =>
			apiClient.request(
				dishesPath,
				dishSchema,
				createJsonRequest("POST", createDishRequestSchema.parse(input)),
			),
		updateDish: (dishId, input) =>
			apiClient.request(
				`${dishesPath}/${encodeURIComponent(dishId)}`,
				dishSchema,
				createJsonRequest("PATCH", updateDishRequestSchema.parse(input)),
			),
		updateDishStatus: (dishId, status) =>
			apiClient.request(
				`${dishesPath}/${encodeURIComponent(dishId)}/status`,
				dishSchema,
				createJsonRequest(
					"PATCH",
					updateDishStatusRequestSchema.parse({ status }),
				),
			),
		listBranchDishes: (branchId) =>
			apiClient.request(branchDishesPath(branchId), branchDishesSchema, {
				method: "GET",
			}),
		updateBranchDishConfiguration: (branchId, dishId, input) =>
			apiClient.request(
				`${branchDishesPath(branchId)}/${encodeURIComponent(dishId)}`,
				branchDishConfigurationSchema,
				createJsonRequest(
					"PUT",
					replaceBranchDishConfigurationRequestSchema.parse(input),
				),
			),
	};
}

function createStatusQuery(status?: CatalogStatus): string {
	return status
		? `?status=${encodeURIComponent(catalogStatusSchema.parse(status))}`
		: "";
}

function createJsonRequest(method: string, body: unknown): RequestInit {
	return {
		method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	};
}
