import { z } from "zod";
import { requestPublicJson } from "../../public-api/api/request-public-json";
import { publicSlugSchema } from "../../public-discovery/contracts/public-discovery.schemas";
import {
	type PublicCheckoutResponse,
	type PublicPaymentStatus,
	publicCheckoutResponseSchema,
	publicPaymentStatusSchema,
} from "../contracts/public-payment.schemas";

export interface PublicPaymentBranchQuery {
	restaurantSlug: string;
	branchSlug: string;
}

export interface CreatePublicCheckoutQuery extends PublicPaymentBranchQuery {
	reservationId: string;
	checkoutToken: string;
}

export interface GetPublicPaymentStatusQuery extends PublicPaymentBranchQuery {
	reservationId: string;
	checkoutToken: string;
}

export function createPublicCheckout(
	baseUrl: string,
	query: CreatePublicCheckoutQuery,
): Promise<PublicCheckoutResponse> {
	const request = parsePaymentQuery(query);

	return requestPublicJson(
		baseUrl,
		getPaymentPath(request),
		publicCheckoutResponseSchema,
		"No se pudo iniciar el checkout.",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${request.checkoutToken}`,
			},
		},
	);
}

export function fetchPublicPaymentStatus(
	baseUrl: string,
	query: GetPublicPaymentStatusQuery,
): Promise<PublicPaymentStatus> {
	const request = parsePaymentQuery(query);

	return requestPublicJson(
		baseUrl,
		getPaymentPath(request),
		publicPaymentStatusSchema,
		"No se pudo consultar el estado del pago.",
		{
			headers: {
				Authorization: `Bearer ${request.checkoutToken}`,
			},
		},
	);
}

function parsePaymentQuery(
	query: CreatePublicCheckoutQuery | GetPublicPaymentStatusQuery,
): CreatePublicCheckoutQuery | GetPublicPaymentStatusQuery {
	return {
		restaurantSlug: publicSlugSchema.parse(query.restaurantSlug),
		branchSlug: publicSlugSchema.parse(query.branchSlug),
		reservationId: z.uuid().parse(query.reservationId),
		checkoutToken: z.string().trim().min(1).parse(query.checkoutToken),
	};
}

function getPaymentPath({
	restaurantSlug,
	branchSlug,
	reservationId,
}: PublicPaymentBranchQuery & { reservationId: string }): string {
	return `public/restaurants/${encodeURIComponent(restaurantSlug)}/branches/${encodeURIComponent(branchSlug)}/reservations/${encodeURIComponent(reservationId)}`;
}
