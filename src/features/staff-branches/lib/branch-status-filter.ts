import {
	type BranchStatus,
	branchStatusFilterSchema,
} from "../contracts/staff-branch.schemas";

export type BranchStatusFilter = "all" | BranchStatus;

export function parseBranchStatusFilter(
	value: string | null | undefined,
): BranchStatusFilter {
	if (!value) return "all";

	const result = branchStatusFilterSchema.safeParse(value);
	return result.success ? result.data : "all";
}

export function getBranchStatusQuery(
	filter: BranchStatusFilter,
): BranchStatus | undefined {
	return filter === "all" ? undefined : filter;
}
