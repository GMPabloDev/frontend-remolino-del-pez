import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { getStaffRuntimeConfig } from "@/config/runtime";
import type { StaffSessionAccess } from "@/features/staff-auth/session/staff-session";
import {
	createStaffBranchesClient,
	type StaffBranchesClient,
} from "../api/staff-branches-client";
import type {
	BranchRules,
	BranchStatus,
	CreateBranchRequest,
	ReplaceBranchScheduleRequest,
	UpdateBranchDetailsRequest,
} from "../contracts/staff-branch.schemas";

export const staffBranchQueryKeys = {
	all: ["staff", "branches"] as const,
	list: (restaurantId: string, status?: BranchStatus) =>
		["staff", "branches", "list", restaurantId, status ?? "all"] as const,
	detail: (restaurantId: string, branchId: string) =>
		["staff", "branches", "detail", restaurantId, branchId] as const,
};

export function useStaffBranchesQuery(
	session: StaffSessionAccess,
	status?: BranchStatus,
) {
	const { restaurantId } = getStaffRuntimeConfig();
	const client = useStaffBranchesClient(session);

	return useQuery({
		queryKey: staffBranchQueryKeys.list(restaurantId, status),
		queryFn: () => client.listBranches(status),
		enabled: session.getAccessToken() !== null,
	});
}

export function useStaffBranchQuery(
	session: StaffSessionAccess,
	branchId: string,
) {
	const { restaurantId } = getStaffRuntimeConfig();
	const client = useStaffBranchesClient(session);

	return useQuery({
		queryKey: staffBranchQueryKeys.detail(restaurantId, branchId),
		queryFn: () => client.getBranch(branchId),
		enabled: session.getAccessToken() !== null && branchId.length > 0,
	});
}

export function useStaffBranchesClient(
	session: StaffSessionAccess,
): StaffBranchesClient {
	return useMemo(() => createStaffBranchesClient(session), [session]);
}

export function useCreateStaffBranchMutation(session: StaffSessionAccess) {
	const client = useStaffBranchesClient(session);
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateBranchRequest) => client.createBranch(input),
		onSuccess: (branch) => updateBranchQueries(queryClient, branch),
	});
}

export function useUpdateStaffBranchDetailsMutation(
	session: StaffSessionAccess,
) {
	const client = useStaffBranchesClient(session);
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			branchId,
			input,
		}: {
			branchId: string;
			input: UpdateBranchDetailsRequest;
		}) => client.updateDetails(branchId, input),
		onSuccess: (branch) => updateBranchQueries(queryClient, branch),
	});
}

export function useUpdateStaffBranchRulesMutation(session: StaffSessionAccess) {
	const client = useStaffBranchesClient(session);
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			branchId,
			input,
		}: {
			branchId: string;
			input: BranchRules;
		}) => client.updateRules(branchId, input),
		onSuccess: (branch) => updateBranchQueries(queryClient, branch),
	});
}

export function useReplaceStaffBranchScheduleMutation(
	session: StaffSessionAccess,
) {
	const client = useStaffBranchesClient(session);
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			branchId,
			input,
		}: {
			branchId: string;
			input: ReplaceBranchScheduleRequest;
		}) => client.replaceSchedule(branchId, input),
		onSuccess: (branch) => updateBranchQueries(queryClient, branch),
	});
}

export function useUpdateStaffBranchStatusMutation(
	session: StaffSessionAccess,
) {
	const client = useStaffBranchesClient(session);
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			branchId,
			status,
		}: {
			branchId: string;
			status: BranchStatus;
		}) => client.updateStatus(branchId, status),
		onSuccess: (branch) => updateBranchQueries(queryClient, branch),
	});
}

function updateBranchQueries(
	queryClient: ReturnType<typeof useQueryClient>,
	branch: Awaited<ReturnType<StaffBranchesClient["getBranch"]>>,
): void {
	const { restaurantId } = getStaffRuntimeConfig();
	queryClient.setQueryData(
		staffBranchQueryKeys.detail(restaurantId, branch.id),
		branch,
	);
	void queryClient.invalidateQueries({
		queryKey: staffBranchQueryKeys.all,
	});
}
