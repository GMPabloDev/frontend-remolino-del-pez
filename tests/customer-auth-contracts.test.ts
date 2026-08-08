import { describe, expect, test } from "bun:test";

import {
	backendCustomerAuthenticationSchema,
	customerMagicLinkExchangeSchema,
	customerMagicLinkRequestSchema,
	customerProfileSchema,
	customerSessionResponseSchema,
} from "../src/features/customer-auth/contracts/customer-auth.schemas";

const profile = {
	fullName: "Ana Pérez",
	email: "ana@example.com",
	phone: "+51987654321",
	restaurantSlug: "restaurante-olimpico",
};

describe("customer-auth contracts", () => {
	test("normalizes manual email requests", () => {
		expect(
			customerMagicLinkRequestSchema.parse({
				email: " ANA@EXAMPLE.COM ",
			}),
		).toEqual({ email: "ana@example.com" });
	});

	test("rejects invalid email and empty magic-link tokens", () => {
		expect(
			customerMagicLinkRequestSchema.safeParse({ email: "invalid" }).success,
		).toBe(false);
		expect(
			customerMagicLinkExchangeSchema.safeParse({ token: "" }).success,
		).toBe(false);
	});

	test("requires the minimum customer profile", () => {
		expect(customerProfileSchema.safeParse(profile).success).toBe(true);
		expect(
			customerProfileSchema.safeParse({ ...profile, phone: "" }).success,
		).toBe(false);
	});

	test("keeps private backend refresh tokens separate from public sessions", () => {
		const backend = backendCustomerAuthenticationSchema.parse({
			accessToken: "access-token",
			refreshToken: "refresh-token",
			customer: profile,
		});
		const publicSession = customerSessionResponseSchema.parse(backend);

		expect(publicSession).toEqual({
			accessToken: "access-token",
			customer: profile,
		});
		expect("refreshToken" in publicSession).toBe(false);
	});
});
