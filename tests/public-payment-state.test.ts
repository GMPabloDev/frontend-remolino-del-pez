import { describe, expect, test } from "bun:test";
import { classifyPublicPaymentStatus } from "../src/features/public-payment/lib/public-payment-state";

const baseStatus = {
	reservationId: "123e4567-e89b-12d3-a456-426614174000",
	reservationStatus: "pending_payment" as const,
	total: "85.00",
	currency: "PEN" as const,
	expiresAt: "2099-08-04T19:45:00-05:00",
	confirmedAt: null,
	payment: null,
};

const payment = (status: "pending" | "paid" | "failed" | "expired") => ({
	id: "123e4567-e89b-12d3-a456-426614174001",
	provider: "stripe" as const,
	status,
	amount: "85.00",
	currency: "PEN" as const,
	createdAt: "2099-08-04T19:30:00-05:00",
	updatedAt: "2099-08-04T19:31:00-05:00",
});

describe("public payment state", () => {
	test("waits when there is no payment or payment is pending", () => {
		expect(classifyPublicPaymentStatus(baseStatus)).toMatchObject({
			kind: "waiting_confirmation",
			reason: "no_payment",
			shouldContinuePolling: true,
		});
		expect(
			classifyPublicPaymentStatus({
				...baseStatus,
				payment: payment("pending"),
			}),
		).toMatchObject({
			kind: "waiting_confirmation",
			reason: "pending",
		});
	});

	test("waits for the webhook when Stripe reports paid first", () => {
		expect(
			classifyPublicPaymentStatus({ ...baseStatus, payment: payment("paid") }),
		).toMatchObject({
			kind: "waiting_confirmation",
			reason: "paid_before_confirmation",
			shouldContinuePolling: true,
		});
	});

	test("confirms only from the reservation status", () => {
		expect(
			classifyPublicPaymentStatus({
				...baseStatus,
				reservationStatus: "confirmed",
				confirmedAt: "2099-08-04T19:32:00-05:00",
				payment: payment("paid"),
			}),
		).toMatchObject({ kind: "confirmed", shouldContinuePolling: false });
	});

	test("allows another checkout after a failed or expired attempt", () => {
		for (const status of ["failed", "expired"] as const) {
			expect(
				classifyPublicPaymentStatus({
					...baseStatus,
					payment: payment(status),
				}),
			).toMatchObject({
				kind: "retryable_attempt",
				reason: status,
				canRetryCheckout: true,
			});
		}
	});

	test("blocks retry for refunds and expired reservations", () => {
		const refundState = classifyPublicPaymentStatus({
			...baseStatus,
			payment: {
				...payment("pending"),
				status: "refund_pending",
			},
		});
		expect(refundState).toMatchObject({
			kind: "refund",
			canRetryCheckout: false,
		});

		const expiredState = classifyPublicPaymentStatus(
			{ ...baseStatus, payment: payment("failed") },
			new Date("2099-08-04T19:46:00-05:00"),
		);
		expect(expiredState).toMatchObject({
			kind: "reservation_expired",
			canRetryCheckout: false,
		});
	});

	test("marks contradictory timestamps as inconsistent", () => {
		expect(
			classifyPublicPaymentStatus({
				...baseStatus,
				reservationStatus: "confirmed",
				confirmedAt: null,
			}),
		).toMatchObject({ kind: "inconsistent" });
		expect(
			classifyPublicPaymentStatus({
				...baseStatus,
				confirmedAt: "2099-08-04T19:32:00-05:00",
			}),
		).toMatchObject({ kind: "inconsistent" });
	});
});
