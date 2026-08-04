import { requestPublicJson } from "../../public-api/api/request-public-json";
import {
	type AvailabilityRequest,
	availabilityRequestSchema,
	type CreateTemporaryReservationRequest,
	type PublicAvailability,
	publicAvailabilitySchema,
	reservationAttemptSchema,
	type TemporaryReservationResponse,
	temporaryReservationResponseSchema,
} from "../contracts/public-reservation.schemas";

export interface PublicReservationBranchQuery {
	restaurantSlug: string;
	branchSlug: string;
}

export interface PublicAvailabilityQuery extends PublicReservationBranchQuery {
	date: string;
	partySize: number;
}

export interface CreateTemporaryReservationQuery
	extends PublicReservationBranchQuery {
	idempotencyKey: string;
	payload: CreateTemporaryReservationRequest;
}

export function fetchPublicAvailability(
	baseUrl: string,
	query: PublicAvailabilityQuery,
): Promise<PublicAvailability> {
	const request: AvailabilityRequest = availabilityRequestSchema.parse({
		date: query.date,
		partySize: query.partySize,
	});
	const params = new URLSearchParams({
		date: request.date,
		partySize: String(request.partySize),
	});

	return requestPublicJson(
		baseUrl,
		`${getReservationBasePath(query)}/availability?${params.toString()}`,
		publicAvailabilitySchema,
		"No se pudo consultar la disponibilidad.",
	);
}

export function createPublicTemporaryReservation(
	baseUrl: string,
	query: CreateTemporaryReservationQuery,
): Promise<TemporaryReservationResponse> {
	const idempotencyKey = reservationAttemptSchema.shape.idempotencyKey.parse(
		query.idempotencyKey,
	);
	const payload = reservationAttemptSchema.shape.payload.parse(query.payload);

	return requestPublicJson(
		baseUrl,
		`${getReservationBasePath(query)}/temporary`,
		temporaryReservationResponseSchema,
		"No se pudo crear la reserva temporal.",
		{
			method: "POST",
			body: JSON.stringify(payload),
			headers: {
				"Content-Type": "application/json",
				"Idempotency-Key": idempotencyKey,
			},
		},
	);
}

function getReservationBasePath({
	restaurantSlug,
	branchSlug,
}: PublicReservationBranchQuery): string {
	return `public/restaurants/${encodeURIComponent(restaurantSlug)}/branches/${encodeURIComponent(branchSlug)}/reservations`;
}
