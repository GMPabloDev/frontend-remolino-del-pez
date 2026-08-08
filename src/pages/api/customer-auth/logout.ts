import type { APIRoute } from "astro";
import { logoutCustomerSession } from "@/features/customer-auth/server/customer-auth-backend";
import {
	CUSTOMER_REFRESH_COOKIE,
	deleteCustomerRefreshCookie,
} from "@/features/customer-auth/server/customer-auth-cookie";
import {
	customerAuthErrorResponse,
	customerAuthNoContentResponse,
} from "@/features/customer-auth/server/customer-auth-http";
import { assertRequestOrigin } from "@/lib/server/validate-request-origin";

export const prerender = false;

export const POST = (async ({ request, cookies }) => {
	try {
		assertRequestOrigin(request);
	} catch (error) {
		return customerAuthErrorResponse(error);
	}

	const refreshToken = cookies.get(CUSTOMER_REFRESH_COOKIE)?.value;

	if (refreshToken) {
		try {
			await logoutCustomerSession(refreshToken);
		} catch {
			return deleteAndRespond(cookies);
		}
	}

	return deleteAndRespond(cookies);
}) satisfies APIRoute;

function deleteAndRespond(
	cookies: Parameters<typeof deleteCustomerRefreshCookie>[0],
) {
	deleteCustomerRefreshCookie(cookies);
	return customerAuthNoContentResponse();
}
