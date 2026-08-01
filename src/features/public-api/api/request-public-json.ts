import type { z } from "zod";

import { ApiClientError, parseApiErrorResponse } from "@/lib/api/api-error";

export async function requestPublicJson<T>(
	baseUrl: string,
	path: string,
	schema: z.ZodType<T>,
	networkMessage: string,
): Promise<T> {
	const endpoint = new URL(path, `${baseUrl}/`);
	let response: Response;

	try {
		response = await fetch(endpoint, {
			headers: { Accept: "application/json" },
		});
	} catch {
		throw new ApiClientError(0, "NETWORK_ERROR", networkMessage);
	}

	let payload: unknown;

	try {
		payload = await response.json();
	} catch {
		payload = undefined;
	}

	if (!response.ok) {
		throw parseApiErrorResponse(response.status, payload);
	}

	const result = schema.safeParse(payload);

	if (!result.success) {
		throw new ApiClientError(
			response.status,
			"INVALID_API_RESPONSE",
			"El servidor devolvió una respuesta con formato inválido.",
		);
	}

	return result.data;
}
