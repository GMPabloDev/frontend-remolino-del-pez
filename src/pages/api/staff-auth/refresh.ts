import type { APIRoute } from "astro";

import type { BackendAuthResponse } from "@/features/staff-auth/contracts/staff-auth.schemas";
import { refreshStaff } from "@/features/staff-auth/server/staff-auth-backend";
import {
	deleteStaffRefreshCookie,
	STAFF_REFRESH_COOKIE,
	setStaffRefreshCookie,
} from "@/features/staff-auth/server/staff-auth-cookie";
import {
	staffAuthErrorResponse,
	staffAuthJsonResponse,
} from "@/features/staff-auth/server/staff-auth-http";
import { assertRequestOrigin } from "@/lib/server/validate-request-origin";
import { ApiClientError } from "@/lib/api/api-error";

export const prerender = false;

export const POST = (async ({ request, cookies }) => {
	try {
		assertRequestOrigin(request);
		const refreshToken = cookies.get(STAFF_REFRESH_COOKIE)?.value;

		if (!refreshToken) {
			throw new ApiClientError(
				401,
				"INVALID_REFRESH_TOKEN",
				"La sesión ya no es válida.",
			);
		}

		const authentication = await refreshStaff(refreshToken);
		setStaffRefreshCookie(cookies, authentication.refreshToken);

		return staffAuthJsonResponse(toSessionResponse(authentication));
	} catch (error) {
		if (
			error instanceof ApiClientError &&
			error.code === "INVALID_REFRESH_TOKEN"
		) {
			deleteStaffRefreshCookie(cookies);
		}

		return staffAuthErrorResponse(error);
	}
}) satisfies APIRoute;

function toSessionResponse(authentication: BackendAuthResponse) {
	return {
		accessToken: authentication.accessToken,
		user: authentication.user,
	};
}
