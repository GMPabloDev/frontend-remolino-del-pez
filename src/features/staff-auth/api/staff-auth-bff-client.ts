import { ApiClientError, parseApiErrorResponse } from "@/lib/api/api-error";
import {
	type LoginInput,
	loginRequestSchema,
	type StaffSessionResponse,
	staffSessionResponseSchema,
} from "../contracts/staff-auth.schemas";

const STAFF_AUTH_BASE_PATH = "/api/staff-auth";

export interface StaffAuthBffClient {
	login(input: LoginInput): Promise<StaffSessionResponse>;
	refresh(): Promise<StaffSessionResponse>;
	logout(): Promise<void>;
}

export function createStaffAuthBffClient(): StaffAuthBffClient {
	return {
		login: (input) => requestLogin(input),
		refresh: () => requestRefresh(),
		logout: () => requestLogout(),
	};
}

async function requestLogin(input: LoginInput): Promise<StaffSessionResponse> {
	const payload = loginRequestSchema.parse(input);

	return requestJson(
		`${STAFF_AUTH_BASE_PATH}/login`,
		{
			method: "POST",
			body: JSON.stringify(payload),
		},
		staffSessionResponseSchema,
	);
}

async function requestRefresh(): Promise<StaffSessionResponse> {
	return requestJson(
		`${STAFF_AUTH_BASE_PATH}/refresh`,
		{ method: "POST" },
		staffSessionResponseSchema,
	);
}

async function requestLogout(): Promise<void> {
	const response = await request(`${STAFF_AUTH_BASE_PATH}/logout`, {
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
	schema: {
		safeParse(value: unknown): { success: true; data: T } | { success: false };
	},
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
