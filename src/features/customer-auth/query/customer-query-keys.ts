export const customerQueryKeys = {
	profile: (restaurantSlug: string) =>
		["customer-auth", "profile", restaurantSlug] as const,
};
