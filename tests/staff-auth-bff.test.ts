import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { AstroCookies } from "astro";

import { POST as loginPost } from "../src/pages/api/staff-auth/login";
import { POST as logoutPost } from "../src/pages/api/staff-auth/logout";
import { POST as refreshPost } from "../src/pages/api/staff-auth/refresh";

const validOrigin = "http://localhost:4321";
const validRestaurantId = "00000000-0000-4000-8000-000000000001";
const originalFetch = globalThis.fetch;

const user = {
	id: "00000000-0000-4000-8000-000000000002",
	fullName: "Ada Lovelace",
	email: "ada@example.com",
	phone: null,
	role: "admin",
	status: "active",
	branchId: null,
	createdAt: "2026-08-01T00:00:00Z",
	updatedAt: "2026-08-01T00:00:00Z",
};

type CookieOptions = Record<string, boolean | number | string>;
type CookieState = ReturnType<typeof createCookies>;
type RouteContext = {
	request: Request;
	cookies: AstroCookies;
};

function createCookies(initialRefreshToken?: string) {
	const values = new Map<string, string>();
	const setCalls: Array<{
		name: string;
		value: string;
		options: CookieOptions;
	}> = [];
	const deleteCalls: Array<{ name: string; options: CookieOptions }> = [];

	if (initialRefreshToken) {
		values.set("staff_refresh_token", initialRefreshToken);
	}

	return {
		values,
		setCalls,
		deleteCalls,
		cookies: {
			get(name: string) {
				const value = values.get(name);
				return value ? { value } : undefined;
			},
			set(name: string, value: string, options: CookieOptions) {
				values.set(name, value);
				setCalls.push({ name, value, options });
			},
			delete(name: string, options: CookieOptions) {
				values.delete(name);
				deleteCalls.push({ name, options });
			},
		} as unknown as AstroCookies,
	};
}

function routeContext(request: Request, cookies: CookieState): RouteContext {
	return { request, cookies: cookies.cookies };
}

function request(path: string, body: unknown, origin = validOrigin): Request {
	return new Request(`${validOrigin}${path}`, {
		method: "POST",
		headers: { Origin: origin, "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
	return (await response.json()) as Record<string, unknown>;
}

function authResponse(refreshToken: string) {
	return Response.json({
		accessToken: `access-${refreshToken}`,
		refreshToken,
		user,
	});
}

beforeEach(() => {
	process.env.PUBLIC_STAFF_RESTAURANT_ID = validRestaurantId;
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("staff authentication BFF", () => {
	test("rejects a missing origin before calling the backend", async () => {
		let fetchCalled = false;
		globalThis.fetch = async () => {
			fetchCalled = true;
			return authResponse("unused");
		};
		const cookies = createCookies();
		const response = await loginPost(
			routeContext(
				new Request(`${validOrigin}/api/staff-auth/login`, {
					method: "POST",
					body: JSON.stringify({
						email: "ada@example.com",
						password: "Password123",
					}),
				}),
				cookies,
			) as never,
		);
		const body = await readJson(response);

		expect(response.status).toBe(403);
		expect(body.error).toEqual({
			code: "FORBIDDEN",
			message: "El origen de la solicitud no está permitido.",
		});
		expect(fetchCalled).toBe(false);
	});

	test("rejects an invalid login payload", async () => {
		let fetchCalled = false;
		globalThis.fetch = async () => {
			fetchCalled = true;
			return authResponse("unused");
		};
		const cookies = createCookies();
		const response = await loginPost(
			routeContext(
				request("/api/staff-auth/login", { email: "not-an-email" }),
				cookies,
			) as never,
		);
		const body = await readJson(response);

		expect(response.status).toBe(400);
		expect(body.error).toEqual({
			code: "VALIDATION_ERROR",
			message: "Los datos enviados no son válidos.",
		});
		expect(fetchCalled).toBe(false);
	});

	test("sanitizes login response and sets secure cookie attributes", async () => {
		globalThis.fetch = async () => authResponse("refresh-1");
		const cookies = createCookies();
		const response = await loginPost(
			routeContext(
				request("/api/staff-auth/login", {
					email: " ADA@EXAMPLE.COM ",
					password: "Password123",
				}),
				cookies,
			) as never,
		);
		const body = await readJson(response);
		const cookie = cookies.setCalls[0];

		expect(response.status).toBe(200);
		expect(body).toEqual({
			accessToken: "access-refresh-1",
			user,
		});
		expect(body.refreshToken).toBeUndefined();
		expect(cookie).toMatchObject({
			name: "staff_refresh_token",
			value: "refresh-1",
			options: {
				httpOnly: true,
				sameSite: "strict",
				secure: false,
				path: "/api/staff-auth",
				maxAge: 30 * 24 * 60 * 60,
			},
		});
		expect(response.headers.get("Cache-Control")).toBe("no-store");
	});

	test("rotates the refresh token and replaces the cookie", async () => {
		globalThis.fetch = async (_input, init) => {
			const payload = JSON.parse(String(init?.body)) as {
				refreshToken: string;
			};
			expect(payload.refreshToken).toBe("refresh-1");
			return authResponse("refresh-2");
		};
		const cookies = createCookies("refresh-1");
		const response = await refreshPost(
			routeContext(
				request("/api/staff-auth/refresh", undefined),
				cookies,
			) as never,
		);
		const body = await readJson(response);

		expect(response.status).toBe(200);
		expect(body.refreshToken).toBeUndefined();
		expect(cookies.values.get("staff_refresh_token")).toBe("refresh-2");
		expect(cookies.setCalls).toHaveLength(1);
	});

	test("deletes the cookie when refresh token rotation is rejected", async () => {
		globalThis.fetch = async () =>
			Response.json(
				{
					error: {
						code: "INVALID_REFRESH_TOKEN",
						message: "La sesión ya no es válida.",
					},
				},
				{ status: 401 },
			);
		const cookies = createCookies("refresh-1");
		const response = await refreshPost(
			routeContext(
				request("/api/staff-auth/refresh", undefined),
				cookies,
			) as never,
		);

		expect(response.status).toBe(401);
		expect(cookies.values.has("staff_refresh_token")).toBe(false);
		expect(cookies.deleteCalls).toHaveLength(1);
	});

	test("finishes local logout when backend revocation fails", async () => {
		globalThis.fetch = async () => {
			throw new Error("backend unavailable");
		};
		const cookies = createCookies("refresh-1");
		const response = await logoutPost(
			routeContext(
				request("/api/staff-auth/logout", undefined),
				cookies,
			) as never,
		);

		expect(response.status).toBe(204);
		expect(cookies.values.has("staff_refresh_token")).toBe(false);
		expect(cookies.deleteCalls).toHaveLength(1);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
	});
});
