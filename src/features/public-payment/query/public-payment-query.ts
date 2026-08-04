import { useMutation, useQuery } from "@tanstack/react-query";

import { runtimeConfig } from "../../../config/runtime";
import { publicQueryKeys } from "../../public-api/query/public-query-keys";
import {
	type CreatePublicCheckoutQuery,
	createPublicCheckout,
	fetchPublicPaymentStatus,
	type GetPublicPaymentStatusQuery,
} from "../api/public-payment-client";
import type {
	PublicCheckoutResponse,
	PublicPaymentStatus,
} from "../contracts/public-payment.schemas";

export function useCreatePublicCheckoutMutation() {
	return useMutation<PublicCheckoutResponse, Error, CreatePublicCheckoutQuery>({
		mutationFn: (query) =>
			createPublicCheckout(runtimeConfig.apiBaseUrl, query),
		retry: false,
	});
}

export function usePublicPaymentStatusQuery(
	query: GetPublicPaymentStatusQuery | null,
	enabled = true,
) {
	const queryKey = publicQueryKeys.paymentStatus(
		runtimeConfig.restaurantSlug,
		query?.branchSlug ?? "",
		query?.reservationId ?? "",
	);

	return useQuery<PublicPaymentStatus>({
		queryKey,
		queryFn: () => {
			if (!query) {
				throw new Error("Payment status query is not ready.");
			}

			return fetchPublicPaymentStatus(runtimeConfig.apiBaseUrl, query);
		},
		enabled: query !== null && enabled,
		retry: false,
		refetchInterval: false,
		refetchOnWindowFocus: false,
	});
}
