import { describe, expect, test } from "bun:test";
import { branchDetailsFormSchema } from "../src/features/staff-branches/contracts/staff-branch-form.schemas";
import {
	BRANCH_DRAFT_TTL_MS,
	type BranchDraftStorage,
	getBranchDraftKey,
	hasBranchDraftConflict,
	readBranchDraft,
	removeAllBranchDrafts,
	removeBranchDraft,
	saveBranchDraft,
} from "../src/features/staff-branches/lib/staff-branch-drafts";

const userId = "00000000-0000-4000-8000-000000000001";
const otherUserId = "00000000-0000-4000-8000-000000000004";
const branchId = "00000000-0000-4000-8000-000000000002";
const now = new Date("2026-08-02T12:00:00.000Z");

class MemoryStorage implements BranchDraftStorage {
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

const values = {
	name: "Sucursal Centro",
	code: "CENTRO",
	address: "Av. Central 123",
	district: "Centro",
	province: "Lima",
	department: "Lima",
	phone: "999111222",
	email: "",
};

describe("branch drafts", () => {
	test("builds isolated keys by user, branch and section", () => {
		expect(getBranchDraftKey(userId, null, "new")).toContain(`${userId}:new`);
		expect(getBranchDraftKey(userId, branchId, "details")).toContain(
			`${userId}:${branchId}:details`,
		);
		expect(() => getBranchDraftKey(userId, null, "details")).toThrow();
		expect(() => getBranchDraftKey(userId, branchId, "new")).toThrow();
	});

	test("saves and reads a versioned draft with a seven-day expiry", () => {
		const storage = new MemoryStorage();
		const saved = saveBranchDraft({
			userId,
			branchId,
			section: "details",
			baseUpdatedAt: "2026-08-02T10:00:00.000Z",
			values,
			now,
			storage,
			valuesSchema: branchDetailsFormSchema,
		});
		const draft = readBranchDraft({
			userId,
			branchId,
			section: "details",
			now: new Date(now.getTime() + 1000),
			storage,
			valuesSchema: branchDetailsFormSchema,
		});

		expect(saved).toBe(true);
		expect(draft?.values).toEqual(values);
		expect(draft?.expiresAt).toBe(
			new Date(now.getTime() + BRANCH_DRAFT_TTL_MS).toISOString(),
		);
		expect(draft?.version).toBe(1);
	});

	test("isolates drafts by user and section", () => {
		const storage = new MemoryStorage();
		saveBranchDraft({
			userId,
			branchId,
			section: "details",
			baseUpdatedAt: null,
			values,
			storage,
			valuesSchema: branchDetailsFormSchema,
		});

		expect(
			readBranchDraft({
				userId: otherUserId,
				branchId,
				section: "details",
				storage,
				valuesSchema: branchDetailsFormSchema,
			}),
		).toBeNull();
		expect(
			readBranchDraft({
				userId,
				branchId,
				section: "rules",
				storage,
				valuesSchema: branchDetailsFormSchema,
			}),
		).toBeNull();
	});

	test("removes expired or invalid drafts", () => {
		const storage = new MemoryStorage();
		saveBranchDraft({
			userId,
			branchId,
			section: "details",
			baseUpdatedAt: null,
			values,
			now,
			storage,
			valuesSchema: branchDetailsFormSchema,
		});

		expect(
			readBranchDraft({
				userId,
				branchId,
				section: "details",
				now: new Date(now.getTime() + BRANCH_DRAFT_TTL_MS),
				storage,
				valuesSchema: branchDetailsFormSchema,
			}),
		).toBeNull();

		storage.setItem(getBranchDraftKey(userId, branchId, "details"), "not-json");
		expect(
			readBranchDraft({
				userId,
				branchId,
				section: "details",
				storage,
				valuesSchema: branchDetailsFormSchema,
			}),
		).toBeNull();
	});

	test("detects conflicts only for existing branches", () => {
		expect(
			hasBranchDraftConflict(
				{ branchId, baseUpdatedAt: "2026-08-01T00:00:00.000Z" },
				"2026-08-02T00:00:00.000Z",
			),
		).toBe(true);
		expect(
			hasBranchDraftConflict(
				{ branchId, baseUpdatedAt: "2026-08-02T00:00:00.000Z" },
				"2026-08-02T00:00:00.000Z",
			),
		).toBe(false);
		expect(
			hasBranchDraftConflict(
				{ branchId: null, baseUpdatedAt: null },
				"anything",
			),
		).toBe(false);
	});

	test("removes one section or every draft owned by the user", () => {
		const storage = new MemoryStorage();
		for (const section of ["new", "details", "rules"] as const) {
			saveBranchDraft({
				userId,
				branchId: section === "new" ? null : branchId,
				section,
				baseUpdatedAt: null,
				values: section === "new" ? values : values,
				storage,
				valuesSchema: branchDetailsFormSchema,
			});
		}
		saveBranchDraft({
			userId: otherUserId,
			branchId,
			section: "details",
			baseUpdatedAt: null,
			values,
			storage,
			valuesSchema: branchDetailsFormSchema,
		});

		removeBranchDraft(userId, branchId, "details", storage);
		removeAllBranchDrafts(userId, storage);

		expect(storage.length).toBe(1);
		expect(
			readBranchDraft({
				userId: otherUserId,
				branchId,
				section: "details",
				storage,
				valuesSchema: branchDetailsFormSchema,
			}),
		).not.toBeNull();
	});

	test("does not persist values that fail the section schema", () => {
		const storage = new MemoryStorage();
		expect(
			saveBranchDraft({
				userId,
				branchId,
				section: "details",
				baseUpdatedAt: null,
				values: { ...values, name: "" },
				storage,
				valuesSchema: branchDetailsFormSchema,
			}),
		).toBe(false);
		expect(storage.length).toBe(0);
	});
});
