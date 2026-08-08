import type { z } from "zod";

import { ApiClientError, parseApiErrorResponse } from "@/lib/api/api-error";
import {
	type CustomerMagicLinkRequest,
	type CustomerSessionResponse,
	customerMagicLinkAcceptedSchema,
	customerMagicLinkExchangeSchema,
	customerMagicLinkRequestSchema,
	customerSessionResponseSchema,
} from "../contracts/customer-auth.schemas";

const CUSTOMER_AUTH_BASE_PATH = "/api/customer-auth";

export interface CustomerAuthBffClient {
	requestMagicLink(
		input: CustomerMagicLinkRequest,
	): Promise<{ message: string }>;
	exchangeMagicLink(token: string): Promise<CustomerSessionResponse>;
	refresh(): Promise<CustomerSessionResponse>;
	logout(): Promise<void>;
}

export function createCustomerAuthBffClient(): CustomerAuthBffClient {
	return {
		requestMagicLink: (input) => requestMagicLink(input),
		exchangeMagicLink: (token) => exchangeMagicLink(token),
		refresh: () => requestRefresh(),
		logout: () => requestLogout(),
	};
}

async function requestMagicLink(
	input: CustomerMagicLinkRequest,
): Promise<{ message: string }> {
	const payload = customerMagicLinkRequestSchema.parse(input);

	return requestJson(
		`${CUSTOMER_AUTH_BASE_PATH}/magic-links`,
		{
			method: "POST",
			body: JSON.stringify(payload),
		},
		customerMagicLinkAcceptedSchema,
	);
}

async function exchangeMagicLink(
	token: string,
): Promise<CustomerSessionResponse> {
	const payload = customerMagicLinkExchangeSchema.parse({ token });

	return requestJson(
		`${CUSTOMER_AUTH_BASE_PATH}/exchange`,
		{
			method: "POST",
			body: JSON.stringify(payload),
		},
		customerSessionResponseSchema,
	);
}

async function requestRefresh(): Promise<CustomerSessionResponse> {
	return requestJson(
		`${CUSTOMER_AUTH_BASE_PATH}/refresh`,
		{ method: "POST" },
		customerSessionResponseSchema,
	);
}

async function requestLogout(): Promise<void> {
	const response = await request(`${CUSTOMER_AUTH_BASE_PATH}/logout`, {
		method: "POST",
	});

	if (!response.ok) {
		throw parseApiErrorResponse(response.status, await readPayload(response));
	}

	if (response.status !== 204) {
		throw new ApiClientError(
			response.status,
			"INVALID_API_RESPONSE",
			"El servidor devolvió una respuesta con formato inválido.",
		);
	}
}

async function requestJson<T>(
	path: string,
	init: RequestInit,
	schema: z.ZodType<T>,
): Promise<T> {
	const response = await request(path, init);
	const payload = await readPayload(response);

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

async function request(path: string, init: RequestInit): Promise<Response> {
	let response: Response;

	try {
		response = await fetch(path, {
			...init,
			credentials: "same-origin",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
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

	return response;
}

async function readPayload(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return undefined;
	}
}
