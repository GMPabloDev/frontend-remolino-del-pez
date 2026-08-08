import { afterEach, describe, expect, test } from "bun:test";
import { z } from "zod";

import { createCustomerApiClient } from "../src/features/customer-auth/api/customer-api-client";
import { ApiClientError } from "../src/lib/api/api-error";

const originalFetch = globalThis.fetch;
const profileSchema = z.object({
	fullName: z.string(),
	email: z.email(),
	phone: z.string(),
	restaurantSlug: z.string(),
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("customer API client", () => {
	test("refreshes once after CUSTOMER_AUTH_REQUIRED and retries with the new token", async () => {
		let accessToken = "expired-token";
		let refreshCalls = 0;
		const authorizationHeaders: string[] = [];
		const session = {
			getAccessToken: () => accessToken,
			refreshAccessToken: async () => {
				refreshCalls += 1;
				accessToken = "fresh-token";
				return accessToken;
			},
			invalidateSession: () => {},
		};
		let requestCount = 0;
		globalThis.fetch = async (_input, init) => {
			requestCount += 1;
			authorizationHeaders.push(
				new Headers(init?.headers).get("Authorization") ?? "",
			);

			if (requestCount === 1) {
				return Response.json(
					{
						error: {
							code: "CUSTOMER_AUTH_REQUIRED",
							message: "auth required",
						},
					},
					{ status: 401 },
				);
			}

			return Response.json({
				fullName: "Ana Pérez",
				email: "ana@example.com",
				phone: "+51987654321",
				restaurantSlug: "restaurante-olimpico",
			});
		};

		const client = createCustomerApiClient(session, {
			apiBaseUrl: "http://localhost:3000",
		});
		const result = await client.request("/customer-auth/me", profileSchema);

		expect(result.fullName).toBe("Ana Pérez");
		expect(refreshCalls).toBe(1);
		expect(authorizationHeaders).toEqual([
			"Bearer expired-token",
			"Bearer fresh-token",
		]);
	});

	test("does not refresh a forbidden response", async () => {
		let refreshCalls = 0;
		const session = {
			getAccessToken: () => "access-token",
			refreshAccessToken: async () => {
				refreshCalls += 1;
				return "new-token";
			},
			invalidateSession: () => {},
		};
		globalThis.fetch = async () =>
			Response.json(
				{
					error: { code: "FORBIDDEN", message: "forbidden" },
				},
				{ status: 403 },
			);

		const client = createCustomerApiClient(session, {
			apiBaseUrl: "http://localhost:3000",
		});

		await expect(
			client.request("/customer-auth/me", profileSchema),
		).rejects.toBeInstanceOf(ApiClientError);
		expect(refreshCalls).toBe(0);
	});
});
