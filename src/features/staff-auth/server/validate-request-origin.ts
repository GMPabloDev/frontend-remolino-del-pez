import { ApiClientError } from "@/lib/api/api-error";

const INVALID_ORIGIN_MESSAGE = "El origen de la solicitud no está permitido.";

export function assertRequestOrigin(request: Request): void {
	const origin = request.headers.get("Origin");
	const requestOrigin = new URL(request.url).origin;

	if (!origin || origin !== requestOrigin) {
		throw new ApiClientError(403, "FORBIDDEN", INVALID_ORIGIN_MESSAGE);
	}
}
