import {
	type TableStatus,
	tableStatusFilterSchema,
} from "../contracts/staff-table.schemas";

export type TableStatusFilter = "all" | TableStatus;

export function parseTableStatusFilter(
	value: string | null | undefined,
): TableStatusFilter {
	if (!value) return "all";

	const result = tableStatusFilterSchema.safeParse(value);
	return result.success ? result.data : "all";
}

export function getTableStatusQuery(
	filter: TableStatusFilter,
): TableStatus | undefined {
	return filter === "all" ? undefined : filter;
}
