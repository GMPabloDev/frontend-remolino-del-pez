import { z } from "zod";

const apiErrorDetailSchema = z.object({
	field: z.string(),
	code: z.string(),
	message: z.string(),
});

export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;

export const apiErrorResponseSchema = z.object({
	error: z.object({
		code: z.string(),
		message: z.string(),
		details: z.array(apiErrorDetailSchema).optional(),
	}),
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export class ApiClientError extends Error {
	constructor(
		public readonly status: number,
		public readonly code: string,
		message: string,
		public readonly details: ApiErrorDetail[] = [],
	) {
		super(message);
		this.name = "ApiClientError";
	}
}

export function parseApiErrorResponse(
	status: number,
	payload: unknown,
): ApiClientError {
	const result = apiErrorResponseSchema.safeParse(payload);

	if (result.success) {
		return new ApiClientError(
			status,
			result.data.error.code,
			result.data.error.message,
			result.data.error.details ?? [],
		);
	}

	return new ApiClientError(
		status,
		"INVALID_API_RESPONSE",
		"El servidor devolvió una respuesta con formato inválido.",
	);
}
