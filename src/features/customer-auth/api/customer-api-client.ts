import type { z } from "zod";

import { runtimeConfig } from "@/config/runtime";
import { ApiClientError, parseApiErrorResponse } from "@/lib/api/api-error";
import type { CustomerSessionAccess } from "../session/customer-session";

export interface CustomerApiClient {
	request<T>(
		path: string,
		schema: z.ZodType<T>,
		init?: RequestInit,
	): Promise<T>;
}

interface CustomerApiClientOptions {
	apiBaseUrl?: string;
}

export function createCustomerApiClient(
	session: CustomerSessionAccess,
	options: CustomerApiClientOptions = {},
): CustomerApiClient {
	const apiBaseUrl = options.apiBaseUrl ?? runtimeConfig.apiBaseUrl;

	return {
		async request<T>(
			path: string,
			schema: z.ZodType<T>,
			init?: RequestInit,
		): Promise<T> {
			const response = await requestWithRefresh(
				session,
				apiBaseUrl,
				path,
				init,
				false,
			);
			const payload = await readPayload(response);
			const result = schema.safeParse(payload);

			if (!result.success) {
				throw new ApiClientError(
					response.status,
					"INVALID_API_RESPONSE",
					"El servidor devolvió una respuesta con formato inválido.",
				);
			}

			return result.data;
		},
	};
}

async function requestWithRefresh(
	session: CustomerSessionAccess,
	apiBaseUrl: string,
	path: string,
	init: RequestInit | undefined,
	hasRetried: boolean,
): Promise<Response> {
	const accessToken = session.getAccessToken();

	if (!accessToken) {
		throw new ApiClientError(
			401,
			"CUSTOMER_AUTH_REQUIRED",
			"La sesión requiere autenticación.",
		);
	}

	let response: Response;

	try {
		response = await fetch(new URL(path, `${apiBaseUrl}/`), {
			...init,
			credentials: "omit",
			headers: createRequestHeaders(init?.headers, accessToken),
		});
	} catch {
		throw new ApiClientError(
			0,
			"NETWORK_ERROR",
			"No se pudo conectar con el servidor.",
		);
	}

	if (response.ok) {
		return response;
	}

	const error = parseApiErrorResponse(
		response.status,
		await readPayload(response),
	);

	if (
		error.status === 401 &&
		error.code === "CUSTOMER_AUTH_REQUIRED" &&
		!hasRetried
	) {
		await session.refreshAccessToken();
		return requestWithRefresh(session, apiBaseUrl, path, init, true);
	}

	if (error.status === 401 && error.code === "CUSTOMER_AUTH_REQUIRED") {
		session.invalidateSession();
	}

	throw error;
}

function createRequestHeaders(
	inputHeaders: HeadersInit | undefined,
	accessToken: string,
): Headers {
	const headers = new Headers(inputHeaders);
	headers.set("Accept", "application/json");
	headers.set("Authorization", `Bearer ${accessToken}`);
	return headers;
}

async function readPayload(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return undefined;
	}
}
