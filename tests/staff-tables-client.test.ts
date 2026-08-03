import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { createStaffTablesClient } from "../src/features/staff-tables/api/staff-tables-client";

const originalFetch = globalThis.fetch;
const restaurantId = "00000000-0000-4000-8000-000000000001";
const branchId = "00000000-0000-4000-8000-000000000002";
const tableId = "00000000-0000-4000-8000-000000000003";
const table = {
	id: tableId,
	branchId,
	code: "TERRAZA-02",
	capacity: 4,
	status: "inactive" as const,
	createdAt: "2026-08-01T00:00:00.000Z",
	updatedAt: "2026-08-02T00:00:00.000Z",
};

const session = {
	getAccessToken: () => "access-token",
	refreshAccessToken: async () => "access-token",
	invalidateSession: () => undefined,
};

beforeEach(() => {
	process.env.PUBLIC_STAFF_RESTAURANT_ID = restaurantId;
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("staff tables client", () => {
	test("builds every administrative request and normalizes payloads", async () => {
		const requests: Array<{ url: string; method: string; body?: unknown }> = [];
		globalThis.fetch = async (input, init) => {
			requests.push({
				url: String(input),
				method: init?.method ?? "GET",
				body: init?.body ? JSON.parse(String(init.body)) : undefined,
			});
			return Response.json(
				String(input).endsWith(`/tables?status=active`)
					? [{ ...table, status: "active" }]
					: table,
			);
		};

		const client = createStaffTablesClient(session);
		await client.listTables(branchId, "active");
		await client.getTable(branchId, tableId);
		await client.createTable(branchId, { code: " terraza-02 ", capacity: 4 });
		await client.updateTable(branchId, tableId, {
			code: "MESA-2",
			capacity: 6,
		});
		await client.updateStatus(branchId, tableId, "active");

		expect(requests).toHaveLength(5);
		expect(requests[0]).toMatchObject({
			url: `http://localhost:3000/restaurants/${restaurantId}/branches/${branchId}/tables?status=active`,
			method: "GET",
		});
		expect(requests[2]).toMatchObject({
			method: "POST",
			body: { code: "TERRAZA-02", capacity: 4 },
		});
		expect(requests[3]).toMatchObject({
			method: "PATCH",
			body: { code: "MESA-2", capacity: 6 },
		});
		expect(requests[4]).toMatchObject({
			url: `http://localhost:3000/restaurants/${restaurantId}/branches/${branchId}/tables/${tableId}/status`,
			method: "PATCH",
			body: { status: "active" },
		});
	});

	test("rejects malformed responses before returning them", async () => {
		globalThis.fetch = async () => Response.json({ id: tableId });
		const client = createStaffTablesClient(session);

		await expect(client.getTable(branchId, tableId)).rejects.toMatchObject({
			code: "INVALID_API_RESPONSE",
		});
	});
});
