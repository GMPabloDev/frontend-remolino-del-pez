const STAFF_DEFAULT_PATH = "/staff";
const STAFF_LOGIN_PATH = "/staff/login";
const STAFF_ORIGIN = "https://staff.invalid";

export function sanitizeStaffReturnTo(
	value: string | null | undefined,
): string {
	if (!value?.startsWith("/") || value.startsWith("//")) {
		return STAFF_DEFAULT_PATH;
	}

	try {
		const url = new URL(value, STAFF_ORIGIN);
		const isStaffPath =
			url.pathname === STAFF_DEFAULT_PATH ||
			url.pathname.startsWith(`${STAFF_DEFAULT_PATH}/`);
		const isLoginPath =
			url.pathname === STAFF_LOGIN_PATH ||
			url.pathname.startsWith(`${STAFF_LOGIN_PATH}/`);

		if (!isStaffPath || isLoginPath || url.origin !== STAFF_ORIGIN) {
			return STAFF_DEFAULT_PATH;
		}

		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return STAFF_DEFAULT_PATH;
	}
}
