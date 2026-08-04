import { afterEach, describe, expect, test } from "bun:test";

import { createStaffCatalogClient } from "../src/features/staff-catalog/api/staff-catalog-client";
import {
	branchDishConfigurationSchema,
	dishSchema,
	menuCategorySchema,
} from "../src/features/staff-catalog/contracts/staff-catalog.schemas";
import {
	branchDishConfigurationFormSchema,
	dishFormSchema,
	toCreateDishRequest,
	toUpdateDishRequest,
} from "../src/features/staff-catalog/contracts/staff-catalog-form.schemas";
import { filterBranchDishes } from "../src/features/staff-catalog/lib/branch-dish-filter";
import {
	getChangedCatalogOrder,
	moveCatalogItem,
	normalizeCatalogOrder,
} from "../src/features/staff-catalog/lib/catalog-order";
import {
	canConfigureBranchMenu,
	canManageStaffCatalog,
} from "../src/features/staff-catalog/lib/staff-catalog-permissions";

const originalFetch = globalThis.fetch;
const restaurantId = "00000000-0000-4000-8000-000000000001";
const branchId = "00000000-0000-4000-8000-000000000002";
const categoryId = "00000000-0000-4000-8000-000000000003";
const dishId = "00000000-0000-4000-8000-000000000004";

const category = {
	id: categoryId,
	restaurantId: restaurantId,
	name: "Fondos",
	position: 1,
	status: "active" as const,
	createdAt: "2026-08-01T00:00:00.000Z",
	updatedAt: "2026-08-02T00:00:00.000Z",
};

const dish = {
	id: dishId,
	restaurantId: restaurantId,
	categoryId,
	categoryName: category.name,
	name: "Arroz con pato",
	description: "Arroz con pato al estilo norteño.",
	imageUrl: null,
	ingredients: ["Arroz", "Pato"],
	allergens: ["Gluten"],
	position: 1,
	status: "active" as const,
	createdAt: "2026-08-01T00:00:00.000Z",
	updatedAt: "2026-08-02T00:00:00.000Z",
};

const branchDish = {
	...dish,
	branchConfiguration: { price: "24.50", status: "available" as const },
};

const session = {
	getAccessToken: () => "access-token",
	refreshAccessToken: async () => "access-token",
	invalidateSession: () => undefined,
};

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("staff catalog contracts", () => {
	test("validates catalog resources and normalizes dish form payloads", () => {
		expect(
			menuCategorySchema.parse({ ...category, internalId: "private" }),
		).toEqual(category);
		expect(dishSchema.parse({ ...dish, internalId: "private" })).toEqual(dish);
		expect(
			branchDishConfigurationSchema.parse({
				price: "24.50",
				status: "available",
			}),
		).toEqual({ price: "24.50", status: "available" });

		expect(
			toCreateDishRequest({
				name: " Arroz con pato ",
				description: " Plato tradicional ",
				imageUrl: "",
				ingredients: [" Arroz "],
				allergens: [],
				categoryId,
				position: 1,
			}),
		).toMatchObject({
			name: "Arroz con pato",
			imageUrl: undefined,
			ingredients: ["Arroz"],
		});
		expect(
			toUpdateDishRequest({
				name: "Arroz con pato",
				description: "Plato tradicional",
				imageUrl: "",
				ingredients: ["Arroz"],
				allergens: [],
				categoryId,
				position: 1,
			}),
		).toMatchObject({ imageUrl: null });
	});

	test("rejects invalid dish and branch configuration values", () => {
		expect(() =>
			dishFormSchema.parse({
				name: "",
				description: "x",
				imageUrl: "",
				ingredients: [],
				allergens: [],
				categoryId,
				position: 1,
			}),
		).toThrow();
		expect(() =>
			branchDishConfigurationFormSchema.parse({
				price: "0.00",
				status: "available",
			}),
		).toThrow();
		expect(() =>
			branchDishConfigurationFormSchema.parse({
				price: "12.5",
				status: "available",
			}),
		).toThrow();
	});

	test("filters commercial dishes locally and preserves accessible order rules", () => {
		expect(filterBranchDishes([branchDish], "available")).toHaveLength(1);
		expect(
			filterBranchDishes(
				[
					branchDish,
					{ ...branchDish, id: `${dishId}1`, branchConfiguration: null },
				],
				"unconfigured",
			),
		).toHaveLength(1);
		expect(
			normalizeCatalogOrder(moveCatalogItem(["a", "b"], "b", "a")),
		).toEqual([
			{ id: "b", position: 1 },
			{ id: "a", position: 2 },
		]);
		expect(
			getChangedCatalogOrder(
				[
					{ id: "a", position: 1 },
					{ id: "b", position: 2 },
				],
				["b", "a"],
			),
		).toEqual([
			{ id: "b", position: 1 },
			{ id: "a", position: 2 },
		]);
	});

	test("enforces global and branch permissions", () => {
		expect(canManageStaffCatalog("admin")).toBe(true);
		expect(canManageStaffCatalog("manager")).toBe(true);
		expect(canManageStaffCatalog("branch_admin")).toBe(false);
		expect(
			canConfigureBranchMenu({ role: "branch_admin", branchId }, branchId),
		).toBe(true);
		expect(
			canConfigureBranchMenu(
				{ role: "branch_admin", branchId: null },
				branchId,
			),
		).toBe(false);
	});
});

describe("staff catalog client", () => {
	test("builds catalog requests and validates responses", async () => {
		const requests: Array<{ url: string; method: string; body?: unknown }> = [];
		process.env.PUBLIC_STAFF_RESTAURANT_ID = restaurantId;
		globalThis.fetch = async (input, init) => {
			const url = String(input);
			requests.push({
				url,
				method: init?.method ?? "GET",
				body: init?.body ? JSON.parse(String(init.body)) : undefined,
			});
			if (url.includes("/branches/") && url.endsWith("/dishes"))
				return Response.json([branchDish]);
			if (url.includes("/branches/") && init?.method === "PUT")
				return Response.json(branchDish.branchConfiguration);
			if (url.includes("/categories") && init?.method === "POST")
				return Response.json(category);
			if (url.includes("/categories?")) return Response.json([category]);
			if (url.endsWith("/categories")) return Response.json([category]);
			if (url.includes("/categories")) return Response.json(category);
			if (url.includes("/dishes") && init?.method === "POST")
				return Response.json(dish);
			if (url.endsWith("/dishes")) return Response.json([dish]);
			return Response.json(dish);
		};

		const client = createStaffCatalogClient(session);
		await client.listCategories("active");
		await client.getCategory(categoryId);
		await client.createCategory({ name: category.name, position: 1 });
		await client.listDishes();
		await client.getDish(dishId);
		await client.createDish({
			name: dish.name,
			description: dish.description,
			ingredients: dish.ingredients,
			allergens: dish.allergens,
			categoryId,
			position: 1,
		});
		await client.listBranchDishes(branchId);
		await client.updateBranchDishConfiguration(branchId, dishId, {
			price: "25.00",
			status: "sold_out",
		});

		expect(requests).toHaveLength(8);
		expect(requests[0]).toMatchObject({
			method: "GET",
			url: `http://localhost:3000/restaurants/${restaurantId}/menu/categories?status=active`,
		});
		expect(requests[2]).toMatchObject({
			method: "POST",
			body: { name: category.name, position: 1 },
		});
		expect(requests[7]).toMatchObject({
			method: "PUT",
			body: { price: "25.00", status: "sold_out" },
		});
	});

	test("rejects malformed catalog responses", async () => {
		process.env.PUBLIC_STAFF_RESTAURANT_ID = restaurantId;
		globalThis.fetch = async () =>
			Response.json({ id: categoryId, name: "incomplete" });
		const client = createStaffCatalogClient(session);
		await expect(client.getCategory(categoryId)).rejects.toMatchObject({
			code: "INVALID_API_RESPONSE",
		});
	});
});
