import { runtimeConfig } from "@/config/runtime";
import { ApiClientError } from "@/lib/api/api-error";
import type { CustomerProfile } from "../contracts/customer-auth.schemas";

const CUSTOMER_RESTAURANT_MISMATCH_MESSAGE =
	"La sesión no pertenece a este restaurante.";

export function assertCustomerRestaurant(
	customer: CustomerProfile,
): CustomerProfile {
	if (customer.restaurantSlug !== runtimeConfig.restaurantSlug) {
		throw new ApiClientError(
			403,
			"CUSTOMER_RESTAURANT_MISMATCH",
			CUSTOMER_RESTAURANT_MISMATCH_MESSAGE,
		);
	}

	return customer;
}
