import { describe, expect, test } from "bun:test";

import { tableFormSchema } from "../src/features/staff-tables/contracts/staff-table-form.schemas";
import {
	getStaffTableDraftKey,
	hasStaffTableDraftConflict,
	readStaffTableDraft,
	removeAllStaffTableDrafts,
	removeStaffTableDraft,
	STAFF_TABLE_DRAFT_TTL_MS,
	type StaffTableDraftStorage,
	saveStaffTableDraft,
} from "../src/features/staff-tables/lib/staff-table-drafts";

const userId = "00000000-0000-4000-8000-000000000001";
const otherUserId = "00000000-0000-4000-8000-000000000004";
const branchId = "00000000-0000-4000-8000-000000000002";
const tableId = "00000000-0000-4000-8000-000000000003";
const now = new Date("2026-08-02T12:00:00.000Z");
const values = { code: "TERRAZA-02", capacity: 4 };

class MemoryStorage implements StaffTableDraftStorage {
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

describe("staff table drafts", () => {
	test("builds isolated keys for new and existing tables", () => {
		expect(getStaffTableDraftKey(userId, branchId, null, "new")).toContain(
			`${userId}:${branchId}:new`,
		);
		expect(
			getStaffTableDraftKey(userId, branchId, tableId, "details"),
		).toContain(`${userId}:${branchId}:${tableId}:details`);
		expect(() =>
			getStaffTableDraftKey(userId, branchId, null, "details"),
		).toThrow();
		expect(() =>
			getStaffTableDraftKey(userId, branchId, tableId, "new"),
		).toThrow();
	});

	test("saves and reads a seven-day versioned draft", () => {
		const storage = new MemoryStorage();
		const saved = saveStaffTableDraft({
			userId,
			branchId,
			tableId,
			section: "details",
			baseUpdatedAt: "2026-08-02T10:00:00.000Z",
			values,
			now,
			storage,
			valuesSchema: tableFormSchema,
		});
		const draft = readStaffTableDraft({
			userId,
			branchId,
			tableId,
			section: "details",
			now: new Date(now.getTime() + 1000),
			storage,
			valuesSchema: tableFormSchema,
		});

		expect(saved).toBe(true);
		expect(draft?.values).toEqual(values);
		expect(draft?.version).toBe(1);
		expect(draft?.expiresAt).toBe(
			new Date(now.getTime() + STAFF_TABLE_DRAFT_TTL_MS).toISOString(),
		);
	});

	test("isolates drafts by user, branch and section", () => {
		const storage = new MemoryStorage();
		saveStaffTableDraft({
			userId,
			branchId,
			tableId: null,
			section: "new",
			baseUpdatedAt: null,
			values,
			storage,
			valuesSchema: tableFormSchema,
		});

		expect(
			readStaffTableDraft({
				userId: otherUserId,
				branchId,
				tableId: null,
				section: "new",
				storage,
				valuesSchema: tableFormSchema,
			}),
		).toBeNull();
		expect(
			readStaffTableDraft({
				userId,
				branchId,
				tableId,
				section: "details",
				storage,
				valuesSchema: tableFormSchema,
			}),
		).toBeNull();
	});

	test("detects conflicts only for existing tables", () => {
		expect(
			hasStaffTableDraftConflict(
				{ tableId, baseUpdatedAt: "2026-08-01T00:00:00.000Z" },
				"2026-08-02T00:00:00.000Z",
			),
		).toBe(true);
		expect(
			hasStaffTableDraftConflict(
				{ tableId, baseUpdatedAt: "2026-08-02T00:00:00.000Z" },
				"2026-08-02T00:00:00.000Z",
			),
		).toBe(false);
		expect(
			hasStaffTableDraftConflict({ tableId: null, baseUpdatedAt: null }, "any"),
		).toBe(false);
	});

	test("removes one draft, all drafts for a user and expired drafts", () => {
		const storage = new MemoryStorage();
		saveStaffTableDraft({
			userId,
			branchId,
			tableId: null,
			section: "new",
			baseUpdatedAt: null,
			values,
			storage,
			valuesSchema: tableFormSchema,
		});
		saveStaffTableDraft({
			userId,
			branchId,
			tableId,
			section: "details",
			baseUpdatedAt: null,
			values,
			storage,
			valuesSchema: tableFormSchema,
		});
		saveStaffTableDraft({
			userId: otherUserId,
			branchId,
			tableId,
			section: "details",
			baseUpdatedAt: null,
			values,
			storage,
			valuesSchema: tableFormSchema,
		});

		removeStaffTableDraft(userId, branchId, tableId, "details", storage);
		removeAllStaffTableDrafts(userId, storage);

		expect(storage.length).toBe(1);
		expect(
			readStaffTableDraft({
				userId: otherUserId,
				branchId,
				tableId,
				section: "details",
				storage,
				valuesSchema: tableFormSchema,
			}),
		).not.toBeNull();

		const expiringStorage = new MemoryStorage();
		saveStaffTableDraft({
			userId,
			branchId,
			tableId,
			section: "details",
			baseUpdatedAt: null,
			values,
			now,
			storage: expiringStorage,
			valuesSchema: tableFormSchema,
		});
		expect(
			readStaffTableDraft({
				userId,
				branchId,
				tableId,
				section: "details",
				now: new Date(now.getTime() + STAFF_TABLE_DRAFT_TTL_MS),
				storage: expiringStorage,
				valuesSchema: tableFormSchema,
			}),
		).toBeNull();
	});
});
