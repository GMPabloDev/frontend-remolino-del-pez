import type { AstroCookies } from "astro";

export const STAFF_REFRESH_COOKIE = "staff_refresh_token";
export const STAFF_REFRESH_COOKIE_PATH = "/api/staff-auth";
export const STAFF_REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

const cookieAttributes = {
	httpOnly: true,
	secure: import.meta.env.PROD,
	sameSite: "strict" as const,
	path: STAFF_REFRESH_COOKIE_PATH,
};

export function setStaffRefreshCookie(
	cookies: AstroCookies,
	refreshToken: string,
): void {
	cookies.set(STAFF_REFRESH_COOKIE, refreshToken, {
		...cookieAttributes,
		maxAge: STAFF_REFRESH_MAX_AGE,
	});
}

export function deleteStaffRefreshCookie(cookies: AstroCookies): void {
	cookies.delete(STAFF_REFRESH_COOKIE, cookieAttributes);
}
