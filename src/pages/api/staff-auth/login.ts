import type { APIRoute } from "astro";

import {
	type BackendAuthResponse,
	loginRequestSchema,
} from "@/features/staff-auth/contracts/staff-auth.schemas";
import { loginStaff } from "@/features/staff-auth/server/staff-auth-backend";
import { setStaffRefreshCookie } from "@/features/staff-auth/server/staff-auth-cookie";
import {
	parseStaffAuthBody,
	staffAuthErrorResponse,
	staffAuthJsonResponse,
} from "@/features/staff-auth/server/staff-auth-http";
import { assertRequestOrigin } from "@/features/staff-auth/server/validate-request-origin";

export const prerender = false;

export const POST = (async ({ request, cookies }) => {
	try {
		assertRequestOrigin(request);
		const input = await parseStaffAuthBody(request, loginRequestSchema);
		const authentication = await loginStaff(input);
		setStaffRefreshCookie(cookies, authentication.refreshToken);

		return staffAuthJsonResponse(toSessionResponse(authentication));
	} catch (error) {
		return staffAuthErrorResponse(error);
	}
}) satisfies APIRoute;

function toSessionResponse(authentication: BackendAuthResponse) {
	return {
		accessToken: authentication.accessToken,
		user: authentication.user,
	};
}
