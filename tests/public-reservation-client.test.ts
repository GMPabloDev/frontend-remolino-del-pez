import { afterEach, describe, expect, test } from "bun:test";
import {
	createPublicTemporaryReservation,
	fetchPublicAvailability,
} from "../src/features/public-reservation/api/public-reservation-client";
import { ApiClientError } from "../src/lib/api/api-error";

const originalFetch = globalThis.fetch;
const baseUrl = "https://api.example.test";
const branchQuery = {
	restaurantSlug: "restaurante olimpico",
	branchSlug: "miraflores",
};

const reservationResponse = {
	id: "123e4567-e89b-12d3-a456-426614174000",
	branchSlug: "miraflores",
	status: "pending_payment" as const,
	date: "2026-08-04",
	startTime: "19:30" as const,
	endTime: "21:00" as const,
	timezone: "America/Lima" as const,
	durationMinutes: 90,
	expiresAt: "2026-08-04T20:00:00-05:00",
	partySize: 2,
	customer: {
		fullName: "Ana Pérez",
		email: "ana@example.com",
		phone: "+51987654321",
	},
	items: [
		{
			dishId: "123e4567-e89b-12d3-a456-426614174001",
			name: "Ceviche clásico",
			unitPrice: "42.50",
			quantity: 1,
			subtotal: "42.50",
		},
	],
	currency: "PEN" as const,
	total: "42.50",
	checkoutToken: "sensitive-token",
	createdAt: "2026-08-04T19:30:00-05:00",
};

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("public reservation client", () => {
	test("builds encoded availability requests", async () => {
		let request: Request | undefined;
		globalThis.fetch = async (input, init) => {
			request = new Request(input, init);
			return Response.json({
				date: "2026-08-04",
				timezone: "America/Lima",
				durationMinutes: 90,
				availableTimes: ["19:30"],
			});
		};

		await fetchPublicAvailability(baseUrl, {
			...branchQuery,
			date: "2026-08-04",
			partySize: 2,
		});

		expect(request?.url).toBe(
			"https://api.example.test/public/restaurants/restaurante%20olimpico/branches/miraflores/reservations/availability?date=2026-08-04&partySize=2",
		);
		expect(request?.headers.get("Accept")).toBe("application/json");
	});

	test("sends POST payload and Idempotency-Key", async () => {
		let request: Request | undefined;
		globalThis.fetch = async (input, init) => {
			request = new Request(input, init);
			return Response.json(reservationResponse, { status: 201 });
		};

		await createPublicTemporaryReservation(baseUrl, {
			...branchQuery,
			idempotencyKey: "123e4567-e89b-12d3-a456-426614174002",
			payload: {
				date: "2026-08-04",
				time: "19:30",
				partySize: 2,
				customer: reservationResponse.customer,
				items: [
					{
						dishId: "123e4567-e89b-12d3-a456-426614174001",
						quantity: 1,
					},
				],
			},
		});

		expect(request?.method).toBe("POST");
		expect(request?.headers.get("Idempotency-Key")).toBe(
			"123e4567-e89b-12d3-a456-426614174002",
		);
		expect(request?.headers.get("Content-Type")).toBe("application/json");
		expect(await request?.json()).toMatchObject({
			time: "19:30",
			partySize: 2,
		});
	});

	test("rejects malformed server responses before returning them", async () => {
		globalThis.fetch = async () => Response.json({ invalid: true });

		await expect(
			fetchPublicAvailability(baseUrl, {
				...branchQuery,
				date: "2026-08-04",
				partySize: 2,
			}),
		).rejects.toMatchObject({
			code: "INVALID_API_RESPONSE",
		});
		expect(ApiClientError).toBeDefined();
	});
});
