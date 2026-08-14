import { ApiClientError } from "../../../lib/api/api-error";

export function getCustomerReservationHistoryErrorMessage(
	error: unknown,
): string {
	if (error instanceof ApiClientError && error.status === 0) {
		return "No se pudo conectar con el servidor. Comprueba tu conexión y vuelve a intentarlo.";
	}

	return "No pudimos cargar tu historial de reservas. Puedes intentarlo nuevamente.";
}

export function getCustomerReceiptDownloadErrorMessage(error: unknown): string {
	if (!(error instanceof ApiClientError)) {
		return "No pudimos preparar la descarga. Inténtalo nuevamente.";
	}

	switch (error.code) {
		case "CUSTOMER_RESERVATION_NOT_FOUND":
			return "El comprobante ya no está disponible. Actualiza tu historial para comprobar el estado.";
		case "PAYMENT_RECEIPT_NOT_READY":
			return "El comprobante todavía no está disponible. Actualiza tu historial más tarde.";
		case "DOCUMENT_STORAGE_UNAVAILABLE":
			return "El almacenamiento documental no está disponible. Inténtalo nuevamente.";
		case "NETWORK_ERROR":
			return "No se pudo conectar con el servidor. Comprueba tu conexión y vuelve a intentarlo.";
		default:
			return "La respuesta del servidor no fue válida. Inténtalo nuevamente.";
	}
}

export function isCustomerReceiptRefreshError(error: unknown): boolean {
	return (
		error instanceof ApiClientError &&
		(error.code === "CUSTOMER_RESERVATION_NOT_FOUND" ||
			error.code === "PAYMENT_RECEIPT_NOT_READY")
	);
}
