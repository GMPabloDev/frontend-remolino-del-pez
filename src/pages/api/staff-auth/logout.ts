import type { APIRoute } from "astro";
import { logoutStaff } from "@/features/staff-auth/server/staff-auth-backend";
import {
	deleteStaffRefreshCookie,
	STAFF_REFRESH_COOKIE,
} from "@/features/staff-auth/server/staff-auth-cookie";
import {
	staffAuthErrorResponse,
	staffAuthNoContentResponse,
} from "@/features/staff-auth/server/staff-auth-http";
import { assertRequestOrigin } from "@/features/staff-auth/server/validate-request-origin";

export const prerender = false;

export const POST = (async ({ request, cookies }) => {
	try {
		assertRequestOrigin(request);
	} catch (error) {
		return staffAuthErrorResponse(error);
	}

	const refreshToken = cookies.get(STAFF_REFRESH_COOKIE)?.value;

	if (refreshToken) {
		try {
			await logoutStaff(refreshToken);
		} catch {
			// La salida local no depende de la disponibilidad del backend.
		}
	}

	deleteStaffRefreshCookie(cookies);
	return staffAuthNoContentResponse();
}) satisfies APIRoute;
