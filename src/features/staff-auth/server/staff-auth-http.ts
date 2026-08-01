import type { z } from "zod";

import { ApiClientError } from "@/lib/api/api-error";

const NO_STORE_HEADERS = {
	"Cache-Control": "no-store",
};

export async function parseStaffAuthBody<T>(
	request: Request,
	schema: z.ZodType<T>,
): Promise<T> {
	let payload: unknown;

	try {
		payload = await request.json();
	} catch {
		throw new ApiClientError(
			400,
			"VALIDATION_ERROR",
			"Los datos enviados no son válidos.",
		);
	}

	const result = schema.safeParse(payload);

	if (!result.success) {
		throw new ApiClientError(
			400,
			"VALIDATION_ERROR",
			"Los datos enviados no son válidos.",
		);
	}

	return result.data;
}

export function staffAuthJsonResponse(body: unknown, status = 200): Response {
	return Response.json(body, {
		status,
		headers: NO_STORE_HEADERS,
	});
}

export function staffAuthNoContentResponse(): Response {
	return new Response(null, {
		status: 204,
		headers: NO_STORE_HEADERS,
	});
}

export function staffAuthErrorResponse(error: unknown): Response {
	if (error instanceof ApiClientError) {
		return staffAuthJsonResponse(
			{
				error: {
					code: error.code,
					message: error.message,
				},
			},
			getErrorStatus(error),
		);
	}

	return staffAuthJsonResponse(
		{
			error: {
				code: "INTERNAL_SERVER_ERROR",
				message: "Ocurrió un error interno.",
			},
		},
		500,
	);
}

function getErrorStatus(error: ApiClientError): number {
	if (error.status === 0) {
		return 503;
	}

	if (error.status >= 400 && error.status <= 599) {
		return error.status;
	}

	return error.code === "INVALID_API_RESPONSE" ? 502 : 500;
}
