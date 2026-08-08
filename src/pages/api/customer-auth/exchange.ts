import type { APIRoute } from "astro";

import {
	customerMagicLinkExchangeSchema,
	customerSessionResponseSchema,
} from "@/features/customer-auth/contracts/customer-auth.schemas";
import { exchangeCustomerMagicLink } from "@/features/customer-auth/server/customer-auth-backend";
import { setCustomerRefreshCookie } from "@/features/customer-auth/server/customer-auth-cookie";
import {
	customerAuthErrorResponse,
	customerAuthJsonResponse,
	parseCustomerAuthBody,
} from "@/features/customer-auth/server/customer-auth-http";
import { assertRequestOrigin } from "@/lib/server/validate-request-origin";

export const prerender = false;

export const POST = (async ({ request, cookies }) => {
	try {
		assertRequestOrigin(request);
		const input = await parseCustomerAuthBody(
			request,
			customerMagicLinkExchangeSchema,
		);
		const authentication = await exchangeCustomerMagicLink(input.token);
		const response = customerSessionResponseSchema.parse(authentication);

		setCustomerRefreshCookie(cookies, authentication.refreshToken);
		return customerAuthJsonResponse(response);
	} catch (error) {
		return customerAuthErrorResponse(error);
	}
}) satisfies APIRoute;
