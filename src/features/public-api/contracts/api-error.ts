import { z } from "zod";

const apiErrorDetailSchema = z.object({
	field: z.string(),
	code: z.string(),
	message: z.string(),
});

export const apiErrorResponseSchema = z.object({
	error: z.object({
		code: z.string(),
		message: z.string(),
		details: z.array(apiErrorDetailSchema).optional(),
	}),
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export class PublicApiClientError extends Error {
	constructor(
		public readonly status: number,
		public readonly code: string,
		message: string,
	) {
		super(message);
		this.name = "PublicApiClientError";
	}
}

export function parseApiErrorResponse(
	status: number,
	payload: unknown,
): PublicApiClientError {
	const result = apiErrorResponseSchema.safeParse(payload);

	if (result.success) {
		return new PublicApiClientError(
			status,
			result.data.error.code,
			result.data.error.message,
		);
	}

	return new PublicApiClientError(
		status,
		"INVALID_API_RESPONSE",
		"El servidor devolvió una respuesta con formato inválido.",
	);
}
