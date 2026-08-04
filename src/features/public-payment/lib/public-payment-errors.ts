import { ApiClientError } from "@/lib/api/api-error";

export const publicPaymentErrorCodes = [
	"VALIDATION_ERROR",
	"PUBLIC_PAYMENT_NOT_FOUND",
	"RESERVATION_EXPIRED",
	"RESERVATION_ALREADY_CONFIRMED",
	"PAYMENT_STATE_CONFLICT",
	"PAYMENT_PROVIDER_UNAVAILABLE",
	"NETWORK_ERROR",
	"INVALID_API_RESPONSE",
] as const;

export type PublicPaymentErrorCode = (typeof publicPaymentErrorCodes)[number];

export type PublicPaymentRecoveryAction =
	| "review"
	| "check_status"
	| "retry_checkout"
	| "new_reservation"
	| "contact_branch";

export interface PublicPaymentErrorPresentation {
	code: PublicPaymentErrorCode | "UNKNOWN_ERROR";
	title: string;
	message: string;
	action: PublicPaymentRecoveryAction;
	retryable: boolean;
}

export function getPublicPaymentErrorPresentation(
	error: unknown,
): PublicPaymentErrorPresentation {
	const code = getPublicPaymentErrorCode(error);

	switch (code) {
		case "VALIDATION_ERROR":
			return {
				code,
				title: "Revisa el pago",
				message:
					"El contexto de la reserva ya no es válido. Revisa el resumen antes de continuar.",
				action: "review",
				retryable: false,
			};
		case "PUBLIC_PAYMENT_NOT_FOUND":
			return {
				code,
				title: "No encontramos esta reserva",
				message:
					"La reserva ya no está disponible para consultar o pagar. Conservamos tu carrito.",
				action: "new_reservation",
				retryable: false,
			};
		case "RESERVATION_EXPIRED":
			return {
				code,
				title: "La reserva venció",
				message:
					"El tiempo de la reserva terminó. Puedes conservar tu selección e iniciar otra reserva.",
				action: "new_reservation",
				retryable: false,
			};
		case "RESERVATION_ALREADY_CONFIRMED":
			return {
				code,
				title: "El pago ya está siendo confirmado",
				message:
					"Consultaremos el estado real de la reserva antes de mostrarte un resultado.",
				action: "check_status",
				retryable: false,
			};
		case "PAYMENT_STATE_CONFLICT":
			return {
				code,
				title: "El estado del pago cambió",
				message:
					"No repetiremos el cobro automáticamente. Consulta el estado o inténtalo manualmente.",
				action: "check_status",
				retryable: false,
			};
		case "PAYMENT_PROVIDER_UNAVAILABLE":
			return {
				code,
				title: "Stripe no está disponible",
				message:
					"No se pudo iniciar el pago. Tu reserva sigue protegida mientras esté vigente.",
				action: "retry_checkout",
				retryable: true,
			};
		case "NETWORK_ERROR":
			return {
				code,
				title: "No pudimos conectar",
				message:
					"Comprueba tu conexión y vuelve a intentarlo sin perder tu reserva.",
				action: "retry_checkout",
				retryable: true,
			};
		case "INVALID_API_RESPONSE":
			return {
				code,
				title: "Respuesta inesperada",
				message:
					"El servidor respondió con un formato inesperado. Puedes intentarlo de nuevo manualmente.",
				action: "retry_checkout",
				retryable: true,
			};
		default:
			return {
				code: "UNKNOWN_ERROR",
				title: "No pudimos completar el pago",
				message:
					"Ocurrió un error inesperado. Conservamos tu reserva para que puedas revisarla.",
				action: "retry_checkout",
				retryable: true,
			};
	}
}

function getPublicPaymentErrorCode(
	error: unknown,
): PublicPaymentErrorCode | "UNKNOWN_ERROR" {
	if (!(error instanceof ApiClientError)) return "UNKNOWN_ERROR";

	return publicPaymentErrorCodes.includes(error.code as PublicPaymentErrorCode)
		? (error.code as PublicPaymentErrorCode)
		: "UNKNOWN_ERROR";
}
