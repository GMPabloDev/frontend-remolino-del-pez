import { z } from "zod";

import { publicSlugSchema } from "@/features/public-discovery/contracts/public-discovery.schemas";

export const customerMagicLinkRequestSchema = z.object({
	email: z
		.string()
		.trim()
		.max(320)
		.pipe(z.email("Ingresa un email válido."))
		.transform((email) => email.toLowerCase()),
});

export const customerMagicLinkExchangeSchema = z.object({
	token: z.string().min(1).max(2048),
});

export const customerMagicLinkAcceptedSchema = z.object({
	message: z.string().min(1),
});

export const customerProfileSchema = z.object({
	fullName: z.string().min(1),
	email: z.email(),
	phone: z.string().min(1),
	restaurantSlug: publicSlugSchema,
});

export const backendCustomerAuthenticationSchema = z.object({
	accessToken: z.string().min(1),
	refreshToken: z.string().min(1),
	customer: customerProfileSchema,
});

export const customerSessionResponseSchema = z.object({
	accessToken: z.string().min(1),
	customer: customerProfileSchema,
});

export const customerRefreshTokenSchema = z.string().min(1);

export type CustomerMagicLinkRequest = z.infer<
	typeof customerMagicLinkRequestSchema
>;
export type CustomerMagicLinkExchange = z.infer<
	typeof customerMagicLinkExchangeSchema
>;
export type CustomerMagicLinkAccepted = z.infer<
	typeof customerMagicLinkAcceptedSchema
>;
export type CustomerProfile = z.infer<typeof customerProfileSchema>;
export type BackendCustomerAuthentication = z.infer<
	typeof backendCustomerAuthenticationSchema
>;
export type CustomerSessionResponse = z.infer<
	typeof customerSessionResponseSchema
>;
