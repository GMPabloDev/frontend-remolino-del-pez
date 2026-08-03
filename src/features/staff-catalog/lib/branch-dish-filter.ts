import type { StaffBranchDish } from "../contracts/staff-catalog.schemas";

export type BranchDishFilter =
	| "all"
	| "available"
	| "sold_out"
	| "inactive"
	| "unconfigured";

export function filterBranchDishes(
	dishes: StaffBranchDish[],
	filter: BranchDishFilter,
): StaffBranchDish[] {
	if (filter === "all") return dishes;

	return dishes.filter((dish) => {
		if (filter === "unconfigured") {
			return dish.branchConfiguration === null;
		}

		return dish.branchConfiguration?.status === filter;
	});
}
