import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { getStaffRuntimeConfig } from "@/config/runtime";
import { createStaffApiClient } from "@/features/staff-auth/api/staff-api-client";
import {
	type StaffRestaurant,
	staffRestaurantSchema,
} from "@/features/staff-auth/contracts/staff-restaurant.schema";
import type { StaffSessionAccess } from "@/features/staff-auth/session/staff-session";

export const staffQueryKeys = {
	restaurant: (restaurantId: string) =>
		["staff", "restaurant", restaurantId] as const,
};

export interface StaffRestaurantClient {
	getRestaurant(): Promise<StaffRestaurant>;
}

export function createStaffRestaurantClient(
	session: StaffSessionAccess,
): StaffRestaurantClient {
	const { restaurantId } = getStaffRuntimeConfig();
	const apiClient = createStaffApiClient(session);

	return {
		getRestaurant: () =>
			apiClient.request(`/restaurants/${restaurantId}`, staffRestaurantSchema, {
				method: "GET",
			}),
	};
}

export function useStaffRestaurantQuery(session: StaffSessionAccess) {
	const { restaurantId } = getStaffRuntimeConfig();
	const client = useMemo(() => createStaffRestaurantClient(session), [session]);

	return useQuery({
		queryKey: staffQueryKeys.restaurant(restaurantId),
		queryFn: () => client.getRestaurant(),
		enabled: session.getAccessToken() !== null,
	});
}
