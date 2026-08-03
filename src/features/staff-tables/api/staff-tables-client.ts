import { getStaffRuntimeConfig } from "@/config/runtime";
import { createStaffApiClient } from "@/features/staff-auth/api/staff-api-client";
import type { StaffSessionAccess } from "@/features/staff-auth/session/staff-session";
import {
	type CreateTableRequest,
	createTableRequestSchema,
	type StaffTable,
	staffTableSchema,
	staffTablesSchema,
	type TableStatus,
	tableStatusSchema,
	type UpdateTableRequest,
	updateTableRequestSchema,
	updateTableStatusRequestSchema,
} from "../contracts/staff-table.schemas";

export interface StaffTablesClient {
	listTables(branchId: string, status?: TableStatus): Promise<StaffTable[]>;
	getTable(branchId: string, tableId: string): Promise<StaffTable>;
	createTable(branchId: string, input: CreateTableRequest): Promise<StaffTable>;
	updateTable(
		branchId: string,
		tableId: string,
		input: UpdateTableRequest,
	): Promise<StaffTable>;
	updateStatus(
		branchId: string,
		tableId: string,
		status: TableStatus,
	): Promise<StaffTable>;
}

export function createStaffTablesClient(
	session: StaffSessionAccess,
): StaffTablesClient {
	const { restaurantId } = getStaffRuntimeConfig();
	const apiClient = createStaffApiClient(session);
	const tablesPath = (branchId: string) =>
		`/restaurants/${restaurantId}/branches/${encodeURIComponent(branchId)}/tables`;

	return {
		listTables: (branchId, status) => {
			const query = status
				? `?status=${encodeURIComponent(tableStatusSchema.parse(status))}`
				: "";

			return apiClient.request(
				`${tablesPath(branchId)}${query}`,
				staffTablesSchema,
				{ method: "GET" },
			);
		},
		getTable: (branchId, tableId) =>
			apiClient.request(
				`${tablesPath(branchId)}/${encodeURIComponent(tableId)}`,
				staffTableSchema,
				{ method: "GET" },
			),
		createTable: (branchId, input) =>
			apiClient.request(
				tablesPath(branchId),
				staffTableSchema,
				createJsonRequest("POST", createTableRequestSchema.parse(input)),
			),
		updateTable: (branchId, tableId, input) =>
			apiClient.request(
				`${tablesPath(branchId)}/${encodeURIComponent(tableId)}`,
				staffTableSchema,
				createJsonRequest("PATCH", updateTableRequestSchema.parse(input)),
			),
		updateStatus: (branchId, tableId, status) =>
			apiClient.request(
				`${tablesPath(branchId)}/${encodeURIComponent(tableId)}/status`,
				staffTableSchema,
				createJsonRequest(
					"PATCH",
					updateTableStatusRequestSchema.parse({ status }),
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
