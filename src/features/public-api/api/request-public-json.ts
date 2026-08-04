import type { z } from "zod";

import { ApiClientError, parseApiErrorResponse } from "@/lib/api/api-error";

const PUBLIC_REQUEST_TIMEOUT_MS = 15_000;

export interface PublicJsonRequestOptions {
	method?: RequestInit["method"];
	body?: RequestInit["body"];
	headers?: HeadersInit;
}

export async function requestPublicJson<T>(
	baseUrl: string,
	path: string,
	schema: z.ZodType<T>,
	networkMessage: string,
	options: PublicJsonRequestOptions = {},
): Promise<T> {
	const endpoint = new URL(path, `${baseUrl}/`);
	let response: Response;

	const headers = new Headers(options.headers);
	headers.set("Accept", "application/json");

	const controller = new AbortController();
	const timeoutId = globalThis.setTimeout(
		() => controller.abort(),
		PUBLIC_REQUEST_TIMEOUT_MS,
	);

	try {
		response = await fetch(endpoint, {
			...options,
			headers,
			signal: controller.signal,
		});
	} catch {
		throw new ApiClientError(0, "NETWORK_ERROR", networkMessage);
	} finally {
		globalThis.clearTimeout(timeoutId);
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
