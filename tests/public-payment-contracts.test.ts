import { describe, expect, test } from "bun:test";
import {
	currentPublicPaymentConfirmationSchema,
	publicCheckoutResponseSchema,
	publicCheckoutReturnSchema,
	publicPaymentStatusSchema,
	storedPublicPaymentConfirmationSchema,
} from "../src/features/public-payment/contracts/public-payment.schemas";
import {
	isAllowedPublicCheckoutUrl,
	matchesPublicCheckoutReservation,
	matchesPublicCheckoutReturnReservation,
	matchesPublicPaymentStatusReservation,
} from "../src/features/public-payment/lib/public-payment-contracts";
import { getPublicPaymentConfirmationKey } from "../src/features/public-payment/lib/public-payment-storage";
import {
	type StoredPublicReservation,
	temporaryReservationResponseSchema,
} from "../src/features/public-reservation/contracts/public-reservation.schemas";

const reservation: StoredPublicReservation = {
	version: 1,
	restaurantSlug: "molino-del-pez",
	branchSlug: "miraflores",
	id: "123e4567-e89b-12d3-a456-426614174000",
	status: "pending_payment",
	date: "2099-08-04",
	startTime: "19:30",
	endTime: "21:00",
	timezone: "America/Lima",
	durationMinutes: 90,
	expiresAt: "2099-08-04T20:00:00-05:00",
	partySize: 2,
	items: [
		{
			dishId: "123e4567-e89b-12d3-a456-426614174001",
			name: "Ceviche clásico",
			unitPrice: "42.50",
			quantity: 2,
			subtotal: "85.00",
		},
	],
	currency: "PEN",
	total: "85.00",
	checkoutToken: "opaque-token",
	createdAt: "2099-08-04T19:00:00-05:00",
	savedAt: "2099-08-04T19:01:00-05:00",
};

const checkout = {
	reservationId: reservation.id,
	paymentAttemptId: "123e4567-e89b-12d3-a456-426614174002",
	status: "pending" as const,
	checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test",
	reservationExpiresAt: reservation.expiresAt,
	checkoutExpiresAt: null,
	currency: "PEN" as const,
	total: reservation.total,
};

const paymentStatus = {
	reservationId: reservation.id,
	reservationStatus: "pending_payment" as const,
	payment: null,
	total: reservation.total,
	currency: "PEN" as const,
	expiresAt: reservation.expiresAt,
	confirmedAt: null,
};

describe("public payment contracts", () => {
	test("rejects missing or empty checkout tokens", () => {
		const response = {
			...reservation,
			customer: {
				fullName: "Ana Pérez",
				email: "ana@example.com",
				phone: "+51987654321",
			},
			billingDocument: {
				type: "BOLETA",
				documentNumber: "12345678",
			},
		};
		expect(temporaryReservationResponseSchema.safeParse(response).success).toBe(
			true,
		);
		expect(
			temporaryReservationResponseSchema.safeParse({
				...response,
				checkoutToken: "",
			}).success,
		).toBe(false);
		expect(
			temporaryReservationResponseSchema.safeParse({
				...response,
				checkoutToken: null,
			}).success,
		).toBe(false);
		expect(publicCheckoutResponseSchema.safeParse(checkout).success).toBe(true);
	});

	test("accepts a reusable checkout and validates contextual fields", () => {
		expect(matchesPublicCheckoutReservation(checkout, reservation)).toBe(true);
		expect(
			matchesPublicCheckoutReservation(
				{ ...checkout, total: "86.00" },
				reservation,
			),
		).toBe(false);
	});

	test("validates payment status before classification", () => {
		expect(publicPaymentStatusSchema.safeParse(paymentStatus).success).toBe(
			true,
		);
		expect(
			matchesPublicPaymentStatusReservation(paymentStatus, reservation),
		).toBe(true);
		expect(
			matchesPublicPaymentStatusReservation(
				{ ...paymentStatus, expiresAt: "2099-08-04T20:01:00-05:00" },
				reservation,
			),
		).toBe(false);
	});

	test("requires confirmedAt only for confirmed reservations", () => {
		expect(
			publicPaymentStatusSchema.safeParse({
				...paymentStatus,
				reservationStatus: "confirmed",
				confirmedAt: null,
			}).success,
		).toBe(true);
		expect(
			matchesPublicPaymentStatusReservation(
				{
					...paymentStatus,
					reservationStatus: "confirmed",
					confirmedAt: null,
				},
				reservation,
			),
		).toBe(false);
	});

	test("allows only the exact Stripe Checkout host", () => {
		expect(isAllowedPublicCheckoutUrl(checkout.checkoutUrl)).toBe(true);
		expect(
			isAllowedPublicCheckoutUrl("http://checkout.stripe.com/c/pay/test"),
		).toBe(false);
		expect(isAllowedPublicCheckoutUrl("https://evil.example/c/pay/test")).toBe(
			false,
		);
		expect(
			isAllowedPublicCheckoutUrl("https://checkout.stripe.com.evil.test/pay"),
		).toBe(false);
	});

	test("derives and validates return and confirmation context", () => {
		const checkoutReturn = publicCheckoutReturnSchema.parse({
			version: 1,
			restaurantSlug: reservation.restaurantSlug,
			branchSlug: reservation.branchSlug,
			reservationId: reservation.id,
			paymentAttemptId: checkout.paymentAttemptId,
			initiatedAt: "2099-08-04T19:02:00-05:00",
			reservationExpiresAt: reservation.expiresAt,
		});
		expect(
			matchesPublicCheckoutReturnReservation(checkoutReturn, reservation),
		).toBe(true);

		const confirmation = storedPublicPaymentConfirmationSchema.parse({
			...reservation,
			version: 1,
			status: "confirmed",
			confirmedAt: "2099-08-04T19:03:00-05:00",
		});
		expect("checkoutToken" in confirmation).toBe(false);
		expect("customer" in confirmation).toBe(false);
		const key = getPublicPaymentConfirmationKey(
			reservation.restaurantSlug,
			reservation.branchSlug,
		);
		const current = currentPublicPaymentConfirmationSchema.parse({
			version: 1,
			restaurantSlug: reservation.restaurantSlug,
			branchSlug: reservation.branchSlug,
			reservationId: reservation.id,
			confirmationKey: key,
			savedAt: "2099-08-04T19:03:00-05:00",
		});
		expect(current.confirmationKey).toBe(key);
	});
});
