import type { z } from "zod";

import { runtimeConfig } from "@/config/runtime";
import { ApiClientError, parseApiErrorResponse } from "@/lib/api/api-error";
import {
	type BackendCustomerAuthentication,
	backendCustomerAuthenticationSchema,
	type CustomerMagicLinkRequest,
	type CustomerProfile,
	customerMagicLinkAcceptedSchema,
	customerMagicLinkExchangeSchema,
	customerMagicLinkRequestSchema,
	customerProfileSchema,
	customerRefreshTokenSchema,
} from "../contracts/customer-auth.schemas";
import { assertCustomerRestaurant } from "./customer-auth-restaurant";

const JSON_HEADERS = {
	Accept: "application/json",
	"Content-Type": "application/json",
};

export function requestCustomerMagicLink(
	input: CustomerMagicLinkRequest,
): Promise<{ message: string }> {
	const payload = customerMagicLinkRequestSchema.parse(input);
	const path = `/public/restaurants/${encodeURIComponent(runtimeConfig.restaurantSlug)}/customer-auth/magic-links`;

	return requestBackendJson(
		path,
		{
			method: "POST",
			body: JSON.stringify(payload),
		},
		customerMagicLinkAcceptedSchema,
	);
}

export function exchangeCustomerMagicLink(
	token: string,
): Promise<BackendCustomerAuthentication> {
	const payload = customerMagicLinkExchangeSchema.parse({ token });

	return requestBackendJson(
		"/public/customer-auth/magic-links/exchange",
		{
			method: "POST",
			body: JSON.stringify(payload),
		},
		backendCustomerAuthenticationSchema,
	).then(assertCustomerAuthentication);
}

export function refreshCustomerSession(
	refreshToken: string,
): Promise<BackendCustomerAuthentication> {
	const payload = customerRefreshTokenSchema.parse(refreshToken);

	return requestBackendJson(
		"/customer-auth/refresh",
		{
			method: "POST",
			body: JSON.stringify({ refreshToken: payload }),
		},
		backendCustomerAuthenticationSchema,
	).then(assertCustomerAuthentication);
}

export function logoutCustomerSession(refreshToken: string): Promise<void> {
	const payload = customerRefreshTokenSchema.parse(refreshToken);

	return requestBackendNoContent("/customer-auth/logout", {
		method: "POST",
		body: JSON.stringify({ refreshToken: payload }),
	});
}

export function getCurrentCustomer(
	accessToken: string,
): Promise<CustomerProfile> {
	if (!accessToken) {
		throw new ApiClientError(
			401,
			"CUSTOMER_AUTH_REQUIRED",
			"La sesión requiere autenticación.",
		);
	}

	return requestBackendJson(
		"/customer-auth/me",
		{
			method: "GET",
			headers: { Authorization: `Bearer ${accessToken}` },
		},
		customerProfileSchema,
	).then(assertCustomerRestaurant);
}

function assertCustomerAuthentication(
	authentication: BackendCustomerAuthentication,
): BackendCustomerAuthentication {
	assertCustomerRestaurant(authentication.customer);
	return authentication;
}

async function requestBackendJson<T>(
	path: string,
	init: RequestInit,
	schema: z.ZodType<T>,
): Promise<T> {
	const endpoint = new URL(path, `${runtimeConfig.apiBaseUrl}/`);
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
	const endpoint = new URL(path, `${runtimeConfig.apiBaseUrl}/`);
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

async function readResponsePayload(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return undefined;
	}
}
