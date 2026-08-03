import {
	type CatalogStatus,
	catalogStatusFilterSchema,
} from "../contracts/staff-catalog.schemas";

export type CatalogStatusFilter = "all" | CatalogStatus;

export function parseCatalogStatusFilter(
	value: string | null | undefined,
): CatalogStatusFilter {
	if (!value) return "all";

	const result = catalogStatusFilterSchema.safeParse(value);
	return result.success ? result.data : "all";
}

export function getCatalogStatusQuery(
	filter: CatalogStatusFilter,
): CatalogStatus | undefined {
	return filter === "all" ? undefined : filter;
}
