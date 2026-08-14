import type { CustomerApiClient } from "../../customer-auth/api/customer-api-client";
import {
	type CustomerReceiptDownload,
	type CustomerReservation,
	customerReceiptDownloadSchema,
	customerReservationHistorySchema,
} from "../contracts/customer-reservation.schemas";

export interface CustomerReservationsClient {
	listReservations(): Promise<CustomerReservation[]>;
	getReceiptDownload(reservationId: string): Promise<CustomerReceiptDownload>;
}

export function createCustomerReservationsClient(
	apiClient: CustomerApiClient,
): CustomerReservationsClient {
	return {
		listReservations: () =>
			apiClient.request(
				"/customer/reservations",
				customerReservationHistorySchema,
			),
		getReceiptDownload: (reservationId) =>
			apiClient.request(
				`/customer/reservations/${encodeURIComponent(reservationId)}/receipt/download`,
				customerReceiptDownloadSchema,
			),
	};
}
