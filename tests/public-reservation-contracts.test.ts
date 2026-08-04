import { describe, expect, test } from "bun:test";

import {
	createTemporaryReservationRequestSchema,
	publicAvailabilitySchema,
	reservationCustomerSchema,
	storedPublicReservationSchema,
	temporaryReservationResponseSchema,
} from "../src/features/public-reservation/contracts/public-reservation.schemas";

const validReservation = {
	id: "123e4567-e89b-12d3-a456-426614174000",
	branchSlug: "miraflores",
	status: "pending_payment" as const,
	date: "2026-08-04",
	startTime: "19:30",
	endTime: "14:50",
	timezone: "America/Lima" as const,
	durationMinutes: 90,
	expiresAt: "2026-08-04T19:45:00-05:00",
	partySize: 2,
	customer: {
		fullName: "  Ana Pérez  ",
		email: " ANA@EXAMPLE.COM ",
		phone: "+51 987-654-321",
	},
	items: [
		{
			dishId: "123e4567-e89b-12d3-a456-426614174001",
			name: "Ceviche clásico",
			unitPrice: "42.50",
			quantity: 2,
			subtotal: "85.00",
		},
	],
	currency: "PEN" as const,
	total: "85.00",
	checkoutToken: "sensitive-token",
	createdAt: "2026-08-04T19:30:00-05:00",
};

describe("public reservation contracts", () => {
	test("normalizes customer data and preserves Lima availability values", () => {
		expect(reservationCustomerSchema.parse(validReservation.customer)).toEqual({
			fullName: "Ana Pérez",
			email: "ana@example.com",
			phone: "+51987654321",
		});
		expect(
			publicAvailabilitySchema.parse({
				date: "2026-08-04",
				timezone: "America/Lima",
				durationMinutes: 90,
				availableTimes: ["19:30", "20:00"],
			}),
		).toMatchObject({
			timezone: "America/Lima",
			availableTimes: ["19:30", "20:00"],
		});
	});

	test("rejects invalid phone, time and duplicate dishes", () => {
		expect(() =>
			reservationCustomerSchema.parse({
				...validReservation.customer,
				phone: "987654321",
			}),
		).toThrow();
		expect(() =>
			createTemporaryReservationRequestSchema.parse({
				date: validReservation.date,
				time: "19:10",
				partySize: 2,
				customer: validReservation.customer,
				items: [],
			}),
		).toThrow();
	});

	test("accepts nullable checkout token and removes customer from stored reservation", () => {
		const response = temporaryReservationResponseSchema.parse({
			...validReservation,
			checkoutToken: null,
		});
		const stored = storedPublicReservationSchema.parse({
			...response,
			version: 1,
			restaurantSlug: "restaurante-olimpico",
			savedAt: "2026-08-04T19:31:00-05:00",
		});

		expect(stored).not.toHaveProperty("customer");
		expect(stored).toHaveProperty("checkoutToken", null);
	});
});
