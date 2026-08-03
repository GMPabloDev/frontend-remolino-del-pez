import { describe, expect, test } from "bun:test";

import {
	createTableRequestSchema,
	staffTableSchema,
	updateTableRequestSchema,
} from "../src/features/staff-tables/contracts/staff-table.schemas";
import { tableFormSchema } from "../src/features/staff-tables/contracts/staff-table-form.schemas";
import {
	canCreateStaffTable,
	canManageStaffTable,
} from "../src/features/staff-tables/lib/staff-table-permissions";
import {
	getTableStatusQuery,
	parseTableStatusFilter,
} from "../src/features/staff-tables/lib/table-status-filter";

const branchId = "00000000-0000-4000-8000-000000000002";
const tableId = "00000000-0000-4000-8000-000000000003";
const user = {
	role: "branch_admin" as const,
	branchId,
};

const table = {
	id: tableId,
	branchId,
	code: "TERRAZA-02",
	capacity: 4,
	status: "inactive" as const,
	createdAt: "2026-08-01T00:00:00.000Z",
	updatedAt: "2026-08-02T00:00:00.000Z",
};

describe("staff table contracts", () => {
	test("normalizes valid codes and preserves positive integer capacity", () => {
		expect(
			createTableRequestSchema.parse({ code: " terraza-02 ", capacity: 4 }),
		).toEqual({ code: "TERRAZA-02", capacity: 4 });
		expect(
			updateTableRequestSchema.parse({ code: "mesa_1", capacity: 1 }),
		).toEqual({ code: "MESA_1", capacity: 1 });
	});

	test("rejects invalid codes and capacities", () => {
		expect(() => tableFormSchema.parse({ code: "", capacity: 2 })).toThrow();
		expect(() =>
			tableFormSchema.parse({ code: "MESA 1", capacity: 2 }),
		).toThrow();
		expect(() =>
			tableFormSchema.parse({ code: "MESA-1", capacity: 0 }),
		).toThrow();
		expect(() =>
			tableFormSchema.parse({ code: "MESA-1", capacity: 2.5 }),
		).toThrow();
	});

	test("validates the response contract and strips unknown fields", () => {
		expect(staffTableSchema.parse({ ...table, internalId: "private" })).toEqual(
			table,
		);
	});

	test("normalizes status filters and permissions", () => {
		expect(parseTableStatusFilter(null)).toBe("all");
		expect(parseTableStatusFilter("active")).toBe("active");
		expect(parseTableStatusFilter("unknown")).toBe("all");
		expect(getTableStatusQuery("all")).toBeUndefined();
		expect(getTableStatusQuery("inactive")).toBe("inactive");
		expect(canCreateStaffTable("admin")).toBe(true);
		expect(canCreateStaffTable("manager")).toBe(true);
		expect(canCreateStaffTable("branch_admin")).toBe(false);
		expect(canManageStaffTable(user, branchId)).toBe(true);
		expect(
			canManageStaffTable(user, "00000000-0000-4000-8000-000000000004"),
		).toBe(false);
	});
});
