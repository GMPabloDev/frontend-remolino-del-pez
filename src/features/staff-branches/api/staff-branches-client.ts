import { getStaffRuntimeConfig } from "@/config/runtime";
import { createStaffApiClient } from "@/features/staff-auth/api/staff-api-client";
import type { StaffSessionAccess } from "@/features/staff-auth/session/staff-session";
import {
	type BranchRules,
	type BranchStatus,
	branchStatusSchema,
	type CreateBranchRequest,
	createBranchRequestSchema,
	type ReplaceBranchScheduleRequest,
	replaceBranchScheduleRequestSchema,
	type StaffBranch,
	staffBranchesSchema,
	staffBranchSchema,
	type UpdateBranchDetailsRequest,
	updateBranchDetailsRequestSchema,
	updateBranchRulesRequestSchema,
	updateBranchStatusRequestSchema,
} from "../contracts/staff-branch.schemas";

export interface StaffBranchesClient {
	listBranches(status?: BranchStatus): Promise<StaffBranch[]>;
	getBranch(branchId: string): Promise<StaffBranch>;
	createBranch(input: CreateBranchRequest): Promise<StaffBranch>;
	updateDetails(
		branchId: string,
		input: UpdateBranchDetailsRequest,
	): Promise<StaffBranch>;
	updateRules(branchId: string, input: BranchRules): Promise<StaffBranch>;
	replaceSchedule(
		branchId: string,
		input: ReplaceBranchScheduleRequest,
	): Promise<StaffBranch>;
	updateStatus(branchId: string, status: BranchStatus): Promise<StaffBranch>;
}

export function createStaffBranchesClient(
	session: StaffSessionAccess,
): StaffBranchesClient {
	const { restaurantId } = getStaffRuntimeConfig();
	const apiClient = createStaffApiClient(session);
	const branchesPath = `/restaurants/${restaurantId}/branches`;

	return {
		listBranches: (status) => {
			const query = status
				? `?status=${encodeURIComponent(branchStatusSchema.parse(status))}`
				: "";

			return apiClient.request(`${branchesPath}${query}`, staffBranchesSchema, {
				method: "GET",
			});
		},
		getBranch: (branchId) =>
			apiClient.request(
				`${branchesPath}/${encodeURIComponent(branchId)}`,
				staffBranchSchema,
				{ method: "GET" },
			),
		createBranch: (input) =>
			apiClient.request(
				branchesPath,
				staffBranchSchema,
				createJsonRequest("POST", createBranchRequestSchema.parse(input)),
			),
		updateDetails: (branchId, input) =>
			apiClient.request(
				`${branchesPath}/${encodeURIComponent(branchId)}`,
				staffBranchSchema,
				createJsonRequest(
					"PATCH",
					updateBranchDetailsRequestSchema.parse(input),
				),
			),
		updateRules: (branchId, input) =>
			apiClient.request(
				`${branchesPath}/${encodeURIComponent(branchId)}`,
				staffBranchSchema,
				createJsonRequest(
					"PATCH",
					updateBranchRulesRequestSchema.parse({ rules: input }),
				),
			),
		replaceSchedule: (branchId, input) =>
			apiClient.request(
				`${branchesPath}/${encodeURIComponent(branchId)}/schedule`,
				staffBranchSchema,
				createJsonRequest(
					"PUT",
					replaceBranchScheduleRequestSchema.parse(input),
				),
			),
		updateStatus: (branchId, status) =>
			apiClient.request(
				`${branchesPath}/${encodeURIComponent(branchId)}/status`,
				staffBranchSchema,
				createJsonRequest(
					"PATCH",
					updateBranchStatusRequestSchema.parse({ status }),
				),
			),
	};
}

function createJsonRequest(method: string, body: unknown): RequestInit {
	return {
		method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	};
}
