import { afterEach, describe, expect, test } from "bun:test";
import {
	createPublicCheckout,
	fetchPublicPaymentStatus,
} from "../src/features/public-payment/api/public-payment-client";

const originalFetch = globalThis.fetch;
const baseUrl = "https://api.example.test";
const query = {
	restaurantSlug: "restaurante olimpico",
	branchSlug: "miraflores",
	reservationId: "123e4567-e89b-12d3-a456-426614174000",
	checkoutToken: "sensitive-checkout-token",
};

const checkoutResponse = {
	reservationId: query.reservationId,
	paymentAttemptId: "123e4567-e89b-12d3-a456-426614174001",
	status: "pending" as const,
	checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test",
	reservationExpiresAt: "2099-08-04T19:45:00-05:00",
	checkoutExpiresAt: null,
	currency: "PEN" as const,
	total: "85.00",
};

const paymentStatusResponse = {
	reservationId: query.reservationId,
	reservationStatus: "pending_payment" as const,
	payment: null,
	total: "85.00",
	currency: "PEN" as const,
	expiresAt: checkoutResponse.reservationExpiresAt,
	confirmedAt: null,
};

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("public payment client", () => {
	test("sends checkout token only as Authorization with an empty body", async () => {
		let request: Request | undefined;
		globalThis.fetch = async (input, init) => {
			request = new Request(input, init);
			return Response.json(checkoutResponse, { status: 201 });
		};

		await createPublicCheckout(baseUrl, query);

		expect(request?.url).toBe(
			"https://api.example.test/public/restaurants/restaurante%20olimpico/branches/miraflores/reservations/123e4567-e89b-12d3-a456-426614174000/checkout",
		);
		expect(request?.method).toBe("POST");
		expect(request?.headers.get("Authorization")).toBe(
			"Bearer sensitive-checkout-token",
		);
		expect(request?.body).toBeNull();
		expect(request?.url).not.toContain(query.checkoutToken);
	});

	test("accepts a reused checkout session with HTTP 200", async () => {
		globalThis.fetch = async () => Response.json(checkoutResponse);

		await expect(createPublicCheckout(baseUrl, query)).resolves.toMatchObject({
			status: "pending",
		});
	});

	test("uses the same bearer contract for payment status without exposing the token", async () => {
		let request: Request | undefined;
		globalThis.fetch = async (input, init) => {
			request = new Request(input, init);
			return Response.json(paymentStatusResponse);
		};

		await fetchPublicPaymentStatus(baseUrl, query);

		expect(request?.method).toBe("GET");
		expect(request?.url).toContain(
			"/reservations/123e4567-e89b-12d3-a456-426614174000/payment",
		);
		expect(request?.headers.get("Authorization")).toBe(
			"Bearer sensitive-checkout-token",
		);
		expect(request?.body).toBeNull();
		expect(request?.url).not.toContain(query.checkoutToken);
	});

	test("rejects malformed checkout responses", async () => {
		globalThis.fetch = async () =>
			Response.json({ reservationId: query.reservationId }, { status: 201 });

		await expect(createPublicCheckout(baseUrl, query)).rejects.toMatchObject({
			code: "INVALID_API_RESPONSE",
		});
	});

	test("maps a typed API error without exposing the token", async () => {
		globalThis.fetch = async () =>
			Response.json(
				{
					error: {
						code: "PAYMENT_PROVIDER_UNAVAILABLE",
						message: "Stripe no disponible",
					},
				},
				{ status: 503 },
			);

		await expect(createPublicCheckout(baseUrl, query)).rejects.toMatchObject({
			code: "PAYMENT_PROVIDER_UNAVAILABLE",
			status: 503,
		});
	});

	test("rejects an empty checkout token before making a request", async () => {
		let requestCount = 0;
		globalThis.fetch = async () => {
			requestCount += 1;
			return Response.json(checkoutResponse, { status: 201 });
		};

		expect(() =>
			createPublicCheckout(baseUrl, { ...query, checkoutToken: " " }),
		).toThrow();
		expect(requestCount).toBe(0);
	});
});
