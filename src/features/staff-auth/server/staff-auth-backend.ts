import type { z } from "zod";

import { getStaffRuntimeConfig } from "@/config/runtime";
import { ApiClientError, parseApiErrorResponse } from "@/lib/api/api-error";
import {
	type BackendAuthResponse,
	backendAuthResponseSchema,
	type LoginInput,
	loginRequestSchema,
	refreshTokenSchema,
} from "../contracts/staff-auth.schemas";

const JSON_HEADERS = {
	Accept: "application/json",
	"Content-Type": "application/json",
};

async function readResponsePayload(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return undefined;
	}
}

async function requestBackendJson<T>(
	path: string,
	init: RequestInit,
	schema: z.ZodType<T>,
): Promise<T> {
	const { apiBaseUrl } = getStaffRuntimeConfig();
	const endpoint = new URL(path, `${apiBaseUrl}/`);
	let response: Response;

	try {
		response = await fetch(endpoint, {
			...init,
			headers: {
				...JSON_HEADERS,
				...init.headers,
			},
		});
	} catch {
		throw new ApiClientError(
			0,
			"NETWORK_ERROR",
			"No se pudo conectar con el servidor.",
		);
	}

	const payload = await readResponsePayload(response);

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

async function requestBackendNoContent(
	path: string,
	init: RequestInit,
): Promise<void> {
	const { apiBaseUrl } = getStaffRuntimeConfig();
	const endpoint = new URL(path, `${apiBaseUrl}/`);
	let response: Response;

	try {
		response = await fetch(endpoint, {
			...init,
			headers: {
				...JSON_HEADERS,
				...init.headers,
			},
		});
	} catch {
		throw new ApiClientError(
			0,
			"NETWORK_ERROR",
			"No se pudo conectar con el servidor.",
		);
	}

	if (!response.ok) {
		throw parseApiErrorResponse(
			response.status,
			await readResponsePayload(response),
		);
	}

	if (response.status !== 204) {
		throw new ApiClientError(
			response.status,
			"INVALID_API_RESPONSE",
			"El servidor devolvió una respuesta con formato inválido.",
		);
	}
}

export function loginStaff(input: LoginInput): Promise<BackendAuthResponse> {
	const payload = loginRequestSchema.parse(input);

	return requestBackendJson(
		"/auth/login",
		{
			method: "POST",
			body: JSON.stringify(payload),
		},
		backendAuthResponseSchema,
	);
}

export function refreshStaff(
	refreshToken: string,
): Promise<BackendAuthResponse> {
	const payload = refreshTokenSchema.parse(refreshToken);

	return requestBackendJson(
		"/auth/refresh",
		{
			method: "POST",
			body: JSON.stringify({ refreshToken: payload }),
		},
		backendAuthResponseSchema,
	);
}

export function logoutStaff(refreshToken: string): Promise<void> {
	const payload = refreshTokenSchema.parse(refreshToken);

	return requestBackendNoContent("/auth/logout", {
		method: "POST",
		body: JSON.stringify({ refreshToken: payload }),
	});
}
