export const publicQueryKeys = {
	restaurant: (restaurantSlug: string) =>
		["public", "restaurant", restaurantSlug] as const,
	branches: (restaurantSlug: string) =>
		["public", "branches", restaurantSlug] as const,
	menu: (restaurantSlug: string, branchSlug: string) =>
		["public", "menu", restaurantSlug, branchSlug] as const,
	availability: (
		restaurantSlug: string,
		branchSlug: string,
		date: string,
		partySize: number,
	) =>
		[
			"public",
			"availability",
			restaurantSlug,
			branchSlug,
			date,
			partySize,
		] as const,
};
