import { describe, expect, test } from "bun:test";
import {
	branchRulesSchema,
	branchScheduleIntervalSchema,
} from "../src/features/staff-branches/contracts/staff-branch.schemas";
import {
	branchScheduleFormSchema,
	DEFAULT_BRANCH_RULES,
	toCreateBranchRequest,
	toReplaceBranchScheduleRequest,
	toUpdateBranchDetailsRequest,
} from "../src/features/staff-branches/contracts/staff-branch-form.schemas";
import {
	getBranchStatusQuery,
	parseBranchStatusFilter,
} from "../src/features/staff-branches/lib/branch-status-filter";
import {
	canCreateStaffBranch,
	canManageStaffBranch,
} from "../src/features/staff-branches/lib/staff-branch-permissions";
import { parseApiErrorResponse } from "../src/lib/api/api-error";

const branchId = "00000000-0000-4000-8000-000000000002";

const branchDetails = {
	name: "  Miraflores ",
	code: " MIR ",
	address: "Av. Larco 123",
	district: "Miraflores",
	province: "Lima",
	department: "Lima",
	phone: "999111222",
	email: "   ",
};

describe("staff branch contracts", () => {
	test("uses the agreed default reservation rules", () => {
		expect(DEFAULT_BRANCH_RULES).toEqual({
			defaultReservationDurationMinutes: 60,
			minimumAdvanceMinutes: 60,
			maximumAdvanceDays: 30,
			arrivalToleranceMinutes: 15,
			maxPartySize: 12,
		});
	});

	test("omits a blank email on creation and maps it to null on update", () => {
		const createRequest = toCreateBranchRequest({
			...branchDetails,
			rules: DEFAULT_BRANCH_RULES,
		});
		const updateRequest = toUpdateBranchDetailsRequest(branchDetails);

		expect(Object.hasOwn(createRequest, "email")).toBe(false);
		expect(updateRequest.email).toBeNull();
		expect(createRequest.name).toBe("Miraflores");
		expect(createRequest.code).toBe("MIR");
	});

	test("rejects an invalid cross-field reservation rule", () => {
		const result = branchRulesSchema.safeParse({
			...DEFAULT_BRANCH_RULES,
			minimumAdvanceMinutes: 24 * 60 * 30,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].path).toEqual(["minimumAdvanceMinutes"]);
		}
	});

	test("rejects invalid interval times and inverted intervals", () => {
		expect(
			branchScheduleIntervalSchema.safeParse({
				dayOfWeek: 1,
				startTime: "09:00",
				endTime: "09:00",
			}).success,
		).toBe(false);
		expect(
			branchScheduleIntervalSchema.safeParse({
				dayOfWeek: 8,
				startTime: "25:00",
				endTime: "26:00",
			}).success,
		).toBe(false);
	});

	test("rejects overlapping intervals on the same day", () => {
		const result = branchScheduleFormSchema.safeParse({
			intervals: [
				{ dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
				{ dayOfWeek: 1, startTime: "11:00", endTime: "13:00" },
			],
		});

		expect(result.success).toBe(false);
	});

	test("sorts schedule intervals before sending them", () => {
		const request = toReplaceBranchScheduleRequest({
			intervals: [
				{ dayOfWeek: 2, startTime: "12:00", endTime: "13:00" },
				{ dayOfWeek: 1, startTime: "18:00", endTime: "20:00" },
				{ dayOfWeek: 1, startTime: "09:00", endTime: "11:00" },
			],
		});

		expect(request.intervals.map((interval) => interval.startTime)).toEqual([
			"09:00",
			"18:00",
			"12:00",
		]);
	});

	test("normalizes filters and permission rules", () => {
		expect(parseBranchStatusFilter(undefined)).toBe("all");
		expect(parseBranchStatusFilter("unknown")).toBe("all");
		expect(parseBranchStatusFilter("active")).toBe("active");
		expect(getBranchStatusQuery("all")).toBeUndefined();
		expect(getBranchStatusQuery("inactive")).toBe("inactive");

		expect(canCreateStaffBranch("admin")).toBe(true);
		expect(canCreateStaffBranch("manager")).toBe(true);
		expect(canCreateStaffBranch("branch_admin")).toBe(false);
		expect(
			canManageStaffBranch({ role: "branch_admin", branchId }, branchId),
		).toBe(true);
		expect(
			canManageStaffBranch(
				{ role: "branch_admin", branchId },
				"00000000-0000-4000-8000-000000000003",
			),
		).toBe(false);
	});
});

describe("API error details", () => {
	test("preserves typed validation details and falls back safely", () => {
		const error = parseApiErrorResponse(422, {
			error: {
				code: "VALIDATION_ERROR",
				message: "Invalid branch",
				details: [
					{ field: "code", code: "DUPLICATE", message: "Already exists" },
				],
			},
		});
		const fallback = parseApiErrorResponse(500, { unexpected: true });

		expect(error.details).toEqual([
			{ field: "code", code: "DUPLICATE", message: "Already exists" },
		]);
		expect(fallback.code).toBe("INVALID_API_RESPONSE");
		expect(fallback.details).toEqual([]);
	});
});
