import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { createStaffBranchesClient } from "../src/features/staff-branches/api/staff-branches-client";
import { DEFAULT_BRANCH_RULES } from "../src/features/staff-branches/contracts/staff-branch-form.schemas";

const originalFetch = globalThis.fetch;
const restaurantId = "00000000-0000-4000-8000-000000000001";
const branchId = "00000000-0000-4000-8000-000000000002";

const branch = {
	id: branchId,
	restaurantId,
	slug: "miraflores",
	name: "Miraflores",
	code: "MIR",
	address: "Av. Larco 123",
	district: "Miraflores",
	province: "Lima",
	department: "Lima",
	phone: "999111222",
	email: null,
	status: "inactive" as const,
	createdAt: "2026-08-01T00:00:00.000Z",
	updatedAt: "2026-08-02T00:00:00.000Z",
	rules: DEFAULT_BRANCH_RULES,
	intervals: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }],
};

beforeEach(() => {
	process.env.PUBLIC_STAFF_RESTAURANT_ID = restaurantId;
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("staff branches client", () => {
	test("validates responses and builds every administrative request", async () => {
		const requests: Array<{ url: string; method: string; body?: unknown }> = [];
		globalThis.fetch = async (input, init) => {
			requests.push({
				url: String(input),
				method: init?.method ?? "GET",
				body: init?.body ? JSON.parse(String(init.body)) : undefined,
			});
			return Response.json(
				String(input).endsWith(
					`/restaurants/${restaurantId}/branches?status=active`,
				)
					? [branch]
					: branch,
			);
		};

		const client = createStaffBranchesClient({
			getAccessToken: () => "access-token",
			refreshAccessToken: async () => "access-token",
			invalidateSession: () => undefined,
		});

		await client.listBranches("active");
		await client.getBranch(branchId);
		await client.createBranch({
			name: branch.name,
			code: branch.code,
			address: branch.address,
			district: branch.district,
			province: branch.province,
			department: branch.department,
			phone: branch.phone,
			rules: DEFAULT_BRANCH_RULES,
		});
		await client.updateDetails(branchId, {
			name: branch.name,
			code: branch.code,
			address: branch.address,
			district: branch.district,
			province: branch.province,
			department: branch.department,
			phone: branch.phone,
			email: null,
		});
		await client.updateRules(branchId, DEFAULT_BRANCH_RULES);
		await client.replaceSchedule(branchId, { intervals: branch.intervals });
		await client.updateStatus(branchId, "active");

		expect(requests).toHaveLength(7);
		expect(requests[0]).toMatchObject({
			url: `http://localhost:3000/restaurants/${restaurantId}/branches?status=active`,
			method: "GET",
		});
		expect(requests[1]).toMatchObject({
			url: `http://localhost:3000/restaurants/${restaurantId}/branches/${branchId}`,
			method: "GET",
		});
		expect(requests[2]).toMatchObject({
			method: "POST",
			body: { name: branch.name, rules: DEFAULT_BRANCH_RULES },
		});
		expect(requests[3]).toMatchObject({
			method: "PATCH",
			body: { email: null },
		});
		expect(requests[4].body).toEqual({ rules: DEFAULT_BRANCH_RULES });
		expect(requests[5].body).toEqual({ intervals: branch.intervals });
		expect(requests[6]).toMatchObject({
			url: `http://localhost:3000/restaurants/${restaurantId}/branches/${branchId}/status`,
			method: "PATCH",
			body: { status: "active" },
		});
	});

	test("rejects malformed branch responses before returning them", async () => {
		globalThis.fetch = async () =>
			Response.json({ id: branchId, name: "incomplete" });
		const client = createStaffBranchesClient({
			getAccessToken: () => "access-token",
			refreshAccessToken: async () => "access-token",
			invalidateSession: () => undefined,
		});

		await expect(client.getBranch(branchId)).rejects.toMatchObject({
			code: "INVALID_API_RESPONSE",
		});
	});
});
