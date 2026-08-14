import { useQuery } from "@tanstack/react-query";

import { runtimeConfig } from "../../../config/runtime";
import { customerQueryKeys } from "../../customer-auth/query/customer-query-keys";
import type { CustomerReservationsClient } from "../api/customer-reservations-client";
import type { CustomerReservation } from "../contracts/customer-reservation.schemas";

export function useCustomerReservationsQuery(
	client: CustomerReservationsClient,
	enabled: boolean,
) {
	return useQuery<CustomerReservation[]>({
		queryKey: customerQueryKeys.reservations(runtimeConfig.restaurantSlug),
		queryFn: () => client.listReservations(),
		enabled,
		retry: false,
	});
}
