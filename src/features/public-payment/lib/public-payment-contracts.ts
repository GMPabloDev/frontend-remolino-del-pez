import type { StoredPublicReservation } from "../../public-reservation/contracts/public-reservation.schemas";
import type {
	PublicCheckoutResponse,
	PublicCheckoutReturn,
	PublicPaymentStatus,
} from "../contracts/public-payment.schemas";

export function isAllowedPublicCheckoutUrl(value: string): boolean {
	try {
		const url = new URL(value);

		return url.protocol === "https:" && url.hostname === "checkout.stripe.com";
	} catch {
		return false;
	}
}

export function matchesPublicCheckoutReservation(
	checkout: PublicCheckoutResponse,
	reservation: StoredPublicReservation,
): boolean {
	return (
		checkout.reservationId === reservation.id &&
		checkout.currency === reservation.currency &&
		checkout.total === reservation.total &&
		matchesTimestamp(checkout.reservationExpiresAt, reservation.expiresAt)
	);
}

export function matchesPublicPaymentStatusReservation(
	paymentStatus: PublicPaymentStatus,
	reservation: StoredPublicReservation,
): boolean {
	if (
		paymentStatus.reservationId !== reservation.id ||
		paymentStatus.currency !== reservation.currency ||
		paymentStatus.total !== reservation.total ||
		!matchesTimestamp(paymentStatus.expiresAt, reservation.expiresAt)
	) {
		return false;
	}

	if (paymentStatus.reservationStatus === "confirmed") {
		if (paymentStatus.confirmedAt === null) return false;
	} else if (paymentStatus.confirmedAt !== null) {
		return false;
	}

	if (!paymentStatus.payment) return true;

	return (
		paymentStatus.payment.amount === paymentStatus.total &&
		paymentStatus.payment.currency === paymentStatus.currency
	);
}

export function matchesPublicCheckoutReturnReservation(
	checkoutReturn: PublicCheckoutReturn,
	reservation: StoredPublicReservation,
): boolean {
	return (
		checkoutReturn.restaurantSlug === reservation.restaurantSlug &&
		checkoutReturn.branchSlug === reservation.branchSlug &&
		checkoutReturn.reservationId === reservation.id &&
		matchesTimestamp(checkoutReturn.reservationExpiresAt, reservation.expiresAt)
	);
}

function matchesTimestamp(first: string, second: string): boolean {
	const firstTime = Date.parse(first);
	const secondTime = Date.parse(second);

	return (
		Number.isFinite(firstTime) &&
		Number.isFinite(secondTime) &&
		firstTime === secondTime
	);
}
