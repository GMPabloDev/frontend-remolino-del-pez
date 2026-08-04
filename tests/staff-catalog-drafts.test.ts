import { describe, expect, test } from "bun:test";

import {
	branchDishConfigurationDraftSchema,
	branchDishConfigurationFormSchema,
} from "../src/features/staff-catalog/contracts/staff-catalog-form.schemas";
import {
	getStaffCatalogDraftKey,
	hasBranchDishConfigurationConflict,
	hasCatalogDraftOrderConflict,
	hasCatalogUpdatedAtConflict,
	readStaffCatalogDraft,
	removeAllStaffCatalogDrafts,
	removeStaffCatalogDraft,
	STAFF_CATALOG_DRAFT_TTL_MS,
	type StaffCatalogDraftStorage,
	saveStaffCatalogDraft,
} from "../src/features/staff-catalog/lib/staff-catalog-drafts";

const userId = "00000000-0000-4000-8000-000000000001";
const otherUserId = "00000000-0000-4000-8000-000000000005";
const categoryId = "00000000-0000-4000-8000-000000000002";
const dishId = "00000000-0000-4000-8000-000000000003";
const branchId = "00000000-0000-4000-8000-000000000004";
const now = new Date("2026-08-02T12:00:00.000Z");

class MemoryStorage implements StaffCatalogDraftStorage {
	private readonly values = new Map<string, string>();

	get length(): number {
		return this.values.size;
	}

	getItem(key: string): string | null {
		return this.values.get(key) ?? null;
	}

	setItem(key: string, value: string): void {
		this.values.set(key, value);
	}

	removeItem(key: string): void {
		this.values.delete(key);
	}

	key(index: number): string | null {
		return [...this.values.keys()][index] ?? null;
	}
}

const baseConfiguration = { price: "24.50", status: "available" as const };
const values = { price: "", status: "inactive" as const };

function saveConfigurationDraft(storage: MemoryStorage, owner = userId): void {
	saveStaffCatalogDraft({
		userId: owner,
		section: "branch-configuration",
		resourceId: dishId,
		branchId,
		base: baseConfiguration,
		values,
		now,
		storage,
		valuesSchema: branchDishConfigurationDraftSchema,
		baseSchema: branchDishConfigurationFormSchema,
	});
}

describe("staff catalog drafts", () => {
	test("isolates keys by user, resource, branch and section", () => {
		expect(getStaffCatalogDraftKey(userId, "dish-new")).toContain(
			`${userId}:dish:new`,
		);
		expect(
			getStaffCatalogDraftKey(userId, "branch-configuration", dishId, branchId),
		).toContain(`${userId}:branch:${branchId}:dish:${dishId}:configuration`);
		expect(() => getStaffCatalogDraftKey(userId, "dish-new", dishId)).toThrow();
		expect(() => getStaffCatalogDraftKey(userId, "category-details")).toThrow();
	});

	test("stores incomplete commercial drafts for seven days", () => {
		const storage = new MemoryStorage();
		saveConfigurationDraft(storage);

		const draft = readStaffCatalogDraft({
			userId,
			section: "branch-configuration",
			resourceId: dishId,
			branchId,
			now: new Date(now.getTime() + 1_000),
			storage,
			valuesSchema: branchDishConfigurationDraftSchema,
			baseSchema: branchDishConfigurationFormSchema,
		});

		expect(draft?.values).toEqual(values);
		expect(draft?.version).toBe(1);
		expect(draft?.expiresAt).toBe(
			new Date(now.getTime() + STAFF_CATALOG_DRAFT_TTL_MS).toISOString(),
		);
	});

	test("detects resource and order conflicts", () => {
		expect(hasCatalogUpdatedAtConflict("a", "b")).toBe(true);
		expect(hasCatalogUpdatedAtConflict("a", "a")).toBe(false);
		expect(hasBranchDishConfigurationConflict(null, baseConfiguration)).toBe(
			true,
		);
		expect(
			hasBranchDishConfigurationConflict(baseConfiguration, {
				price: "24.50",
				status: "sold_out",
			}),
		).toBe(true);
		expect(
			hasCatalogDraftOrderConflict(
				[
					{ id: categoryId, position: 1 },
					{ id: dishId, position: 2 },
				],
				[
					{ id: categoryId, position: 2 },
					{ id: dishId, position: 1 },
				],
			),
		).toBe(true);
	});

	test("removes one draft and all drafts for a user", () => {
		const storage = new MemoryStorage();
		saveConfigurationDraft(storage);
		saveConfigurationDraft(storage, otherUserId);

		removeStaffCatalogDraft(
			userId,
			"branch-configuration",
			dishId,
			branchId,
			storage,
		);
		expect(
			readStaffCatalogDraft({
				userId,
				section: "branch-configuration",
				resourceId: dishId,
				branchId,
				storage,
				valuesSchema: branchDishConfigurationDraftSchema,
				baseSchema: branchDishConfigurationFormSchema,
			}),
		).toBeNull();

		saveConfigurationDraft(storage);
		removeAllStaffCatalogDrafts(userId, storage);
		expect(storage.length).toBe(1);
	});
});
