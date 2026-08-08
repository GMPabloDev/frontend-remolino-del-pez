import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { AstroCookies } from "astro";

import { POST as exchangePost } from "../src/pages/api/customer-auth/exchange";
import { POST as logoutPost } from "../src/pages/api/customer-auth/logout";
import { POST as magicLinksPost } from "../src/pages/api/customer-auth/magic-links";
import { POST as refreshPost } from "../src/pages/api/customer-auth/refresh";

const origin = "http://localhost:4321";
const originalFetch = globalThis.fetch;
const profile = {
	fullName: "Ana Pérez",
	email: "ana@example.com",
	phone: "+51987654321",
	restaurantSlug: "restaurante-olimpico",
};

type CookieOptions = Record<string, boolean | number | string>;

type CookieState = ReturnType<typeof createCookies>;

function createCookies(initialRefreshToken?: string) {
	const values = new Map<string, string>();
	const setCalls: Array<{
		name: string;
		value: string;
		options: CookieOptions;
	}> = [];
	const deleteCalls: Array<{ name: string; options: CookieOptions }> = [];

	if (initialRefreshToken) {
		values.set("customer_refresh_token", initialRefreshToken);
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

function request(path: string, body: unknown): Request {
	return new Request(`${origin}${path}`, {
		method: "POST",
		headers: { Origin: origin, "Content-Type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

function context(requestValue: Request, cookies: CookieState) {
	return { request: requestValue, cookies: cookies.cookies } as never;
}

async function json(response: Response): Promise<Record<string, unknown>> {
	return (await response.json()) as Record<string, unknown>;
}

function authentication(refreshToken: string) {
	return {
		accessToken: `access-${refreshToken}`,
		refreshToken,
		customer: profile,
	};
}

beforeEach(() => {
	process.env.PUBLIC_RESTAURANT_SLUG = "restaurante-olimpico";
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("customer-auth BFF", () => {
	test("rejects requests without Origin before reaching the backend", async () => {
		let called = false;
		globalThis.fetch = async () => {
			called = true;
			return Response.json({ message: "ok" }, { status: 202 });
		};
		const cookies = createCookies();
		const response = await magicLinksPost(
			context(
				new Request(`${origin}/api/customer-auth/magic-links`, {
					method: "POST",
					body: JSON.stringify({ email: "ana@example.com" }),
				}),
				cookies,
			),
		);

		expect(response.status).toBe(403);
		expect(called).toBe(false);
	});

	test("returns the generic 202 response for a magic-link request", async () => {
		let receivedBody: unknown;
		globalThis.fetch = async (_input, init) => {
			receivedBody = JSON.parse(String(init?.body));
			return Response.json({ message: "backend message" }, { status: 202 });
		};
		const response = await magicLinksPost(
			context(
				request("/api/customer-auth/magic-links", {
					email: " ANA@EXAMPLE.COM ",
				}),
				createCookies(),
			),
		);

		expect(response.status).toBe(202);
		expect(receivedBody).toEqual({ email: "ana@example.com" });
	});

	test("exchanges a magic link without returning the refresh token", async () => {
		globalThis.fetch = async () => Response.json(authentication("refresh-1"));
		const cookies = createCookies();
		const response = await exchangePost(
			context(
				request("/api/customer-auth/exchange", { token: "opaque-token" }),
				cookies,
			),
		);
		const body = await json(response);
		const cookie = cookies.setCalls[0];

		expect(response.status).toBe(200);
		expect(body.refreshToken).toBeUndefined();
		expect(body).toEqual({
			accessToken: "access-refresh-1",
			customer: profile,
		});
		expect(cookie).toMatchObject({
			name: "customer_refresh_token",
			value: "refresh-1",
			options: {
				httpOnly: true,
				sameSite: "strict",
				secure: false,
				path: "/api/customer-auth",
				maxAge: 30 * 24 * 60 * 60,
			},
		});
	});

	test("rotates and replaces the customer refresh cookie", async () => {
		globalThis.fetch = async (_input, init) => {
			const body = JSON.parse(String(init?.body)) as { refreshToken: string };
			expect(body.refreshToken).toBe("refresh-1");
			return Response.json(authentication("refresh-2"));
		};
		const cookies = createCookies("refresh-1");
		const response = await refreshPost(
			context(request("/api/customer-auth/refresh", undefined), cookies),
		);

		expect(response.status).toBe(200);
		expect(cookies.values.get("customer_refresh_token")).toBe("refresh-2");
	});

	test("deletes an invalid refresh cookie", async () => {
		globalThis.fetch = async () =>
			Response.json(
				{
					error: {
						code: "INVALID_CUSTOMER_REFRESH_TOKEN",
						message: "La sesión ya no es válida.",
					},
				},
				{ status: 401 },
			);
		const cookies = createCookies("refresh-1");
		const response = await refreshPost(
			context(request("/api/customer-auth/refresh", undefined), cookies),
		);

		expect(response.status).toBe(401);
		expect(cookies.values.has("customer_refresh_token")).toBe(false);
		expect(cookies.deleteCalls).toHaveLength(1);
	});

	test("finishes local logout when backend revocation fails", async () => {
		globalThis.fetch = async () => {
			throw new Error("backend unavailable");
		};
		const cookies = createCookies("refresh-1");
		const response = await logoutPost(
			context(request("/api/customer-auth/logout", undefined), cookies),
		);

		expect(response.status).toBe(204);
		expect(cookies.values.has("customer_refresh_token")).toBe(false);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
	});
});
