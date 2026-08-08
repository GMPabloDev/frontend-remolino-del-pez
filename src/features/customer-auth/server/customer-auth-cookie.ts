import type { AstroCookies } from "astro";

export const CUSTOMER_REFRESH_COOKIE = "customer_refresh_token";
export const CUSTOMER_REFRESH_COOKIE_PATH = "/api/customer-auth";
export const CUSTOMER_REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

const cookieAttributes = {
	httpOnly: true,
	secure: import.meta.env.PROD === true,
	sameSite: "strict" as const,
	path: CUSTOMER_REFRESH_COOKIE_PATH,
};

export function setCustomerRefreshCookie(
	cookies: AstroCookies,
	refreshToken: string,
): void {
	cookies.set(CUSTOMER_REFRESH_COOKIE, refreshToken, {
		...cookieAttributes,
		maxAge: CUSTOMER_REFRESH_MAX_AGE,
	});
}

export function deleteCustomerRefreshCookie(cookies: AstroCookies): void {
	cookies.delete(CUSTOMER_REFRESH_COOKIE, cookieAttributes);
}
