import {
	type CreateTemporaryReservationRequest,
	type ReservationAttempt,
	reservationAttemptSchema,
} from "../contracts/public-reservation.schemas";

export function normalizeReservationPayload(
	payload: CreateTemporaryReservationRequest,
): CreateTemporaryReservationRequest {
	const parsedPayload = reservationAttemptSchema.shape.payload.parse(payload);

	return {
		...parsedPayload,
		items: [...parsedPayload.items].sort((firstItem, secondItem) =>
			firstItem.dishId.localeCompare(secondItem.dishId),
		),
	};
}

export function createReservationIdempotencyKey(): string {
	const randomUUID = globalThis.crypto?.randomUUID;

	if (!randomUUID) {
		throw new Error("crypto.randomUUID is required for reservation attempts.");
	}

	return randomUUID.call(globalThis.crypto);
}

export function createReservationAttempt(
	payload: CreateTemporaryReservationRequest,
	idempotencyKey = createReservationIdempotencyKey(),
): ReservationAttempt {
	return reservationAttemptSchema.parse({
		idempotencyKey,
		payload: normalizeReservationPayload(payload),
	});
}

export function getReservationAttemptForPayload(
	payload: CreateTemporaryReservationRequest,
	previousAttempt?: ReservationAttempt,
): ReservationAttempt {
	const normalizedPayload = normalizeReservationPayload(payload);

	if (
		previousAttempt &&
		areReservationPayloadsEqual(previousAttempt.payload, normalizedPayload)
	) {
		return previousAttempt;
	}

	return createReservationAttempt(normalizedPayload);
}

export function areReservationPayloadsEqual(
	firstPayload: CreateTemporaryReservationRequest,
	secondPayload: CreateTemporaryReservationRequest,
): boolean {
	return (
		JSON.stringify(normalizeReservationPayload(firstPayload)) ===
		JSON.stringify(normalizeReservationPayload(secondPayload))
	);
}
