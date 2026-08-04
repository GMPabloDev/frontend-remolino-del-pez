import { useMutation, useQuery } from "@tanstack/react-query";

import { runtimeConfig } from "../../../config/runtime";
import { publicQueryKeys } from "../../public-api/query/public-query-keys";
import {
	type CreateTemporaryReservationQuery,
	createPublicTemporaryReservation,
	fetchPublicAvailability,
	type PublicAvailabilityQuery,
} from "../api/public-reservation-client";
import type {
	PublicAvailability,
	TemporaryReservationResponse,
} from "../contracts/public-reservation.schemas";

export function usePublicAvailabilityQuery(
	query: PublicAvailabilityQuery | null,
) {
	const queryKey = publicQueryKeys.availability(
		runtimeConfig.restaurantSlug,
		query?.branchSlug ?? "",
		query?.date ?? "",
		query?.partySize ?? 0,
	);

	return useQuery<PublicAvailability>({
		queryKey,
		queryFn: () => {
			if (!query) {
				throw new Error("Availability query is not ready.");
			}

			return fetchPublicAvailability(runtimeConfig.apiBaseUrl, query);
		},
		enabled: query !== null,
		retry: false,
	});
}

export function useCreatePublicTemporaryReservationMutation() {
	return useMutation<
		TemporaryReservationResponse,
		Error,
		CreateTemporaryReservationQuery
	>({
		mutationFn: (query) =>
			createPublicTemporaryReservation(runtimeConfig.apiBaseUrl, query),
		retry: false,
	});
}
