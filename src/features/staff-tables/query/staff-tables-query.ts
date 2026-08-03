import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { getStaffRuntimeConfig } from "@/config/runtime";
import type { StaffSessionAccess } from "@/features/staff-auth/session/staff-session";
import {
	createStaffTablesClient,
	type StaffTablesClient,
} from "../api/staff-tables-client";
import type {
	CreateTableRequest,
	TableStatus,
	UpdateTableRequest,
} from "../contracts/staff-table.schemas";

export const staffTableQueryKeys = {
	all: ["staff", "tables"] as const,
	list: (restaurantId: string, branchId: string, status?: TableStatus) =>
		[
			"staff",
			"tables",
			"list",
			restaurantId,
			branchId,
			status ?? "all",
		] as const,
	detail: (restaurantId: string, branchId: string, tableId: string) =>
		["staff", "tables", "detail", restaurantId, branchId, tableId] as const,
};

export function useStaffTablesQuery(
	session: StaffSessionAccess,
	branchId: string,
	status?: TableStatus,
) {
	const { restaurantId } = getStaffRuntimeConfig();
	const client = useStaffTablesClient(session);

	return useQuery({
		queryKey: staffTableQueryKeys.list(restaurantId, branchId, status),
		queryFn: () => client.listTables(branchId, status),
		retry: false,
		enabled: session.getAccessToken() !== null && branchId.length > 0,
	});
}

export function useStaffTableQuery(
	session: StaffSessionAccess,
	branchId: string,
	tableId: string,
) {
	const { restaurantId } = getStaffRuntimeConfig();
	const client = useStaffTablesClient(session);

	return useQuery({
		queryKey: staffTableQueryKeys.detail(restaurantId, branchId, tableId),
		queryFn: () => client.getTable(branchId, tableId),
		retry: false,
		enabled:
			session.getAccessToken() !== null &&
			branchId.length > 0 &&
			tableId.length > 0,
	});
}

export function useStaffTablesClient(
	session: StaffSessionAccess,
): StaffTablesClient {
	return useMemo(() => createStaffTablesClient(session), [session]);
}

export function useCreateStaffTableMutation(session: StaffSessionAccess) {
	const client = useStaffTablesClient(session);
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			branchId,
			input,
		}: {
			branchId: string;
			input: CreateTableRequest;
		}) => client.createTable(branchId, input),
		onSuccess: (table) => updateTableQueries(queryClient, table),
	});
}

export function useUpdateStaffTableMutation(session: StaffSessionAccess) {
	const client = useStaffTablesClient(session);
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			branchId,
			tableId,
			input,
		}: {
			branchId: string;
			tableId: string;
			input: UpdateTableRequest;
		}) => client.updateTable(branchId, tableId, input),
		onSuccess: (table) => updateTableQueries(queryClient, table),
	});
}

export function useUpdateStaffTableStatusMutation(session: StaffSessionAccess) {
	const client = useStaffTablesClient(session);
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			branchId,
			tableId,
			status,
		}: {
			branchId: string;
			tableId: string;
			status: TableStatus;
		}) => client.updateStatus(branchId, tableId, status),
		onSuccess: (table) => updateTableQueries(queryClient, table),
	});
}

function updateTableQueries(
	queryClient: ReturnType<typeof useQueryClient>,
	table: Awaited<ReturnType<StaffTablesClient["getTable"]>>,
): void {
	const { restaurantId } = getStaffRuntimeConfig();
	queryClient.setQueryData(
		staffTableQueryKeys.detail(restaurantId, table.branchId, table.id),
		table,
	);
	void queryClient.invalidateQueries({ queryKey: staffTableQueryKeys.all });
}
