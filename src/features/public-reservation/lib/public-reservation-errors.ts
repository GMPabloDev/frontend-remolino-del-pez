import { ApiClientError } from "@/lib/api/api-error";

export const publicReservationErrorCodes = [
	"VALIDATION_ERROR",
	"PUBLIC_RESERVATION_NOT_FOUND",
	"RESERVATION_TIME_UNAVAILABLE",
	"DISH_NOT_AVAILABLE",
	"IDEMPOTENCY_KEY_REUSED",
	"NETWORK_ERROR",
	"INVALID_API_RESPONSE",
] as const;

export type PublicReservationErrorCode =
	(typeof publicReservationErrorCodes)[number];

export type PublicReservationRecoveryAction =
	| "retry"
	| "review"
	| "availability"
	| "menu"
	| "discovery";

export interface PublicReservationErrorPresentation {
	code: PublicReservationErrorCode | "UNKNOWN_ERROR";
	title: string;
	message: string;
	action: PublicReservationRecoveryAction;
	retryable: boolean;
}

export function getPublicReservationErrorPresentation(
	error: unknown,
): PublicReservationErrorPresentation {
	const code = getPublicReservationErrorCode(error);

	switch (code) {
		case "VALIDATION_ERROR":
			return {
				code,
				title: "Revisa los datos enviados",
				message:
					"Algunos datos ya no son válidos. Revisa la información antes de continuar.",
				action: "review",
				retryable: false,
			};
		case "PUBLIC_RESERVATION_NOT_FOUND":
			return {
				code,
				title: "Sucursal no disponible",
				message: "Esta sucursal ya no está disponible para recibir reservas.",
				action: "discovery",
				retryable: false,
			};
		case "RESERVATION_TIME_UNAVAILABLE":
			return {
				code,
				title: "El horario ya no está disponible",
				message:
					"La disponibilidad cambió. Conservamos tus datos para que consultes otro horario.",
				action: "availability",
				retryable: false,
			};
		case "DISH_NOT_AVAILABLE":
			return {
				code,
				title: "Revisa tu selección",
				message:
					"Uno o más platos ya no están disponibles. Revisa el menú antes de reservar.",
				action: "menu",
				retryable: false,
			};
		case "IDEMPOTENCY_KEY_REUSED":
			return {
				code,
				title: "No se pudo repetir este intento",
				message:
					"La clave de seguridad ya pertenece a otros datos. Revisa el resumen y genera un nuevo intento.",
				action: "review",
				retryable: false,
			};
		case "NETWORK_ERROR":
			return {
				code,
				title: "No pudimos conectar",
				message:
					"Comprueba tu conexión y vuelve a intentarlo sin perder tus datos.",
				action: "retry",
				retryable: true,
			};
		case "INVALID_API_RESPONSE":
			return {
				code,
				title: "Respuesta inesperada",
				message:
					"El servidor respondió con un formato inesperado. Puedes volver a intentarlo.",
				action: "retry",
				retryable: true,
			};
		default:
			return {
				code: "UNKNOWN_ERROR",
				title: "No pudimos completar la operación",
				message:
					"Ocurrió un error inesperado. Conservamos tus datos para que puedas revisar el flujo.",
				action: "retry",
				retryable: true,
			};
	}
}

function getPublicReservationErrorCode(
	error: unknown,
): PublicReservationErrorCode | "UNKNOWN_ERROR" {
	if (!(error instanceof ApiClientError)) return "UNKNOWN_ERROR";

	return publicReservationErrorCodes.includes(
		error.code as PublicReservationErrorCode,
	)
		? (error.code as PublicReservationErrorCode)
		: "UNKNOWN_ERROR";
}
