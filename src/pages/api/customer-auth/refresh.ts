import type { APIRoute } from "astro";

import {
	customerRefreshTokenSchema,
	customerSessionResponseSchema,
} from "@/features/customer-auth/contracts/customer-auth.schemas";
import { refreshCustomerSession } from "@/features/customer-auth/server/customer-auth-backend";
import {
	CUSTOMER_REFRESH_COOKIE,
	deleteCustomerRefreshCookie,
	setCustomerRefreshCookie,
} from "@/features/customer-auth/server/customer-auth-cookie";
import {
	customerAuthErrorResponse,
	customerAuthJsonResponse,
} from "@/features/customer-auth/server/customer-auth-http";
import { ApiClientError } from "@/lib/api/api-error";
import { assertRequestOrigin } from "@/lib/server/validate-request-origin";

export const prerender = false;

export const POST = (async ({ request, cookies }) => {
	try {
		assertRequestOrigin(request);
		const refreshToken = cookies.get(CUSTOMER_REFRESH_COOKIE)?.value;

		if (!refreshToken) {
			throw new ApiClientError(
				401,
				"INVALID_CUSTOMER_REFRESH_TOKEN",
				"La sesión ya no es válida.",
			);
		}

		const authentication = await refreshCustomerSession(
			customerRefreshTokenSchema.parse(refreshToken),
		);
		const response = customerSessionResponseSchema.parse(authentication);

		setCustomerRefreshCookie(cookies, authentication.refreshToken);
		return customerAuthJsonResponse(response);
	} catch (error) {
		if (
			error instanceof ApiClientError &&
			error.code === "INVALID_CUSTOMER_REFRESH_TOKEN"
		) {
			deleteCustomerRefreshCookie(cookies);
		}

		return customerAuthErrorResponse(error);
	}
}) satisfies APIRoute;
