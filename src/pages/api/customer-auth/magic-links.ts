import type { APIRoute } from "astro";

import { customerMagicLinkRequestSchema } from "@/features/customer-auth/contracts/customer-auth.schemas";
import { requestCustomerMagicLink } from "@/features/customer-auth/server/customer-auth-backend";
import {
	customerAuthErrorResponse,
	customerAuthJsonResponse,
	parseCustomerAuthBody,
} from "@/features/customer-auth/server/customer-auth-http";
import { assertRequestOrigin } from "@/lib/server/validate-request-origin";

export const prerender = false;

export const POST = (async ({ request }) => {
	try {
		assertRequestOrigin(request);
		const input = await parseCustomerAuthBody(
			request,
			customerMagicLinkRequestSchema,
		);
		const response = await requestCustomerMagicLink(input);

		return customerAuthJsonResponse(response, 202);
	} catch (error) {
		return customerAuthErrorResponse(error);
	}
}) satisfies APIRoute;
