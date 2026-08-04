import type {
	PaymentAttemptStatus,
	PublicPaymentStatus,
} from "../contracts/public-payment.schemas";

export type PublicPaymentState =
	| {
			kind: "confirmed";
			canRetryCheckout: false;
			shouldContinuePolling: false;
	  }
	| {
			kind: "waiting_confirmation";
			reason: "no_payment" | "pending" | "paid_before_confirmation";
			canRetryCheckout: false;
			shouldContinuePolling: true;
	  }
	| {
			kind: "retryable_attempt";
			reason: "failed" | "expired";
			canRetryCheckout: true;
			shouldContinuePolling: false;
	  }
	| {
			kind: "reservation_expired";
			canRetryCheckout: false;
			shouldContinuePolling: false;
	  }
	| {
			kind: "refund";
			status: Extract<
				PaymentAttemptStatus,
				"refund_pending" | "refunded" | "refund_failed"
			>;
			canRetryCheckout: false;
			shouldContinuePolling: false;
	  }
	| {
			kind: "inconsistent";
			reason: "confirmed_without_timestamp" | "pending_with_timestamp";
			canRetryCheckout: false;
			shouldContinuePolling: false;
	  };

export function classifyPublicPaymentStatus(
	paymentStatus: PublicPaymentStatus,
	now = new Date(),
): PublicPaymentState {
	if (paymentStatus.reservationStatus === "confirmed") {
		if (paymentStatus.confirmedAt === null) {
			return {
				kind: "inconsistent",
				reason: "confirmed_without_timestamp",
				canRetryCheckout: false,
				shouldContinuePolling: false,
			};
		}

		if (isRefundStatus(paymentStatus.payment?.status)) {
			return {
				kind: "refund",
				status: paymentStatus.payment.status,
				canRetryCheckout: false,
				shouldContinuePolling: false,
			};
		}

		return {
			kind: "confirmed",
			canRetryCheckout: false,
			shouldContinuePolling: false,
		};
	}

	if (paymentStatus.confirmedAt !== null) {
		return {
			kind: "inconsistent",
			reason: "pending_with_timestamp",
			canRetryCheckout: false,
			shouldContinuePolling: false,
		};
	}

	if (isRefundStatus(paymentStatus.payment?.status)) {
		return {
			kind: "refund",
			status: paymentStatus.payment.status,
			canRetryCheckout: false,
			shouldContinuePolling: false,
		};
	}

	if (Date.parse(paymentStatus.expiresAt) <= now.getTime()) {
		return {
			kind: "reservation_expired",
			canRetryCheckout: false,
			shouldContinuePolling: false,
		};
	}

	switch (paymentStatus.payment?.status) {
		case "failed":
		case "expired":
			return {
				kind: "retryable_attempt",
				reason: paymentStatus.payment.status,
				canRetryCheckout: true,
				shouldContinuePolling: false,
			};
		case "paid":
			return {
				kind: "waiting_confirmation",
				reason: "paid_before_confirmation",
				canRetryCheckout: false,
				shouldContinuePolling: true,
			};
		case "pending":
			return {
				kind: "waiting_confirmation",
				reason: "pending",
				canRetryCheckout: false,
				shouldContinuePolling: true,
			};
		default:
			return {
				kind: "waiting_confirmation",
				reason: "no_payment",
				canRetryCheckout: false,
				shouldContinuePolling: true,
			};
	}
}

function isRefundStatus(
	status: PaymentAttemptStatus | undefined,
): status is "refund_pending" | "refunded" | "refund_failed" {
	return (
		status === "refund_pending" ||
		status === "refunded" ||
		status === "refund_failed"
	);
}
