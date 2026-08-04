import { z } from "zod";
import { publicSlugSchema } from "../../public-discovery/contracts/public-discovery.schemas";
import {
	reservationMoneySchema,
	storedPublicReservationSchema,
} from "../../public-reservation/contracts/public-reservation.schemas";

export const PUBLIC_PAYMENT_VERSION = 1 as const;

export const paymentAttemptStatusSchema = z.enum([
	"pending",
	"paid",
	"failed",
	"expired",
	"refund_pending",
	"refunded",
	"refund_failed",
]);

export const reservationPaymentStatusSchema = z.enum([
	"pending_payment",
	"confirmed",
]);

export const publicCheckoutResponseSchema = z.object({
	reservationId: z.uuid(),
	paymentAttemptId: z.uuid(),
	status: z.literal("pending"),
	checkoutUrl: z.url(),
	reservationExpiresAt: z.iso.datetime({ offset: true }),
	checkoutExpiresAt: z.iso.datetime({ offset: true }).nullable(),
	currency: z.literal("PEN"),
	total: reservationMoneySchema,
});

export const publicPaymentAttemptSchema = z.object({
	id: z.uuid(),
	provider: z.literal("stripe"),
	status: paymentAttemptStatusSchema,
	amount: reservationMoneySchema,
	currency: z.literal("PEN"),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
});

export const publicPaymentStatusSchema = z.object({
	reservationId: z.uuid(),
	reservationStatus: reservationPaymentStatusSchema,
	payment: publicPaymentAttemptSchema.nullable(),
	total: reservationMoneySchema,
	currency: z.literal("PEN"),
	expiresAt: z.iso.datetime({ offset: true }),
	confirmedAt: z.iso.datetime({ offset: true }).nullable(),
});

export const publicCheckoutReturnSchema = z.object({
	version: z.literal(PUBLIC_PAYMENT_VERSION),
	restaurantSlug: publicSlugSchema,
	branchSlug: publicSlugSchema,
	reservationId: z.uuid(),
	paymentAttemptId: z.uuid(),
	initiatedAt: z.iso.datetime({ offset: true }),
	reservationExpiresAt: z.iso.datetime({ offset: true }),
});

export const storedPublicPaymentConfirmationSchema =
	storedPublicReservationSchema
		.omit({ version: true, savedAt: true, checkoutToken: true, status: true })
		.extend({
			version: z.literal(PUBLIC_PAYMENT_VERSION),
			status: z.literal("confirmed"),
			confirmedAt: z.iso.datetime({ offset: true }),
			savedAt: z.iso.datetime({ offset: true }),
		});

export const currentPublicPaymentConfirmationSchema = z.object({
	version: z.literal(PUBLIC_PAYMENT_VERSION),
	restaurantSlug: publicSlugSchema,
	branchSlug: publicSlugSchema,
	reservationId: z.uuid(),
	confirmationKey: z.string().min(1),
	savedAt: z.iso.datetime({ offset: true }),
});

export type PaymentAttemptStatus = z.infer<typeof paymentAttemptStatusSchema>;
export type ReservationPaymentStatus = z.infer<
	typeof reservationPaymentStatusSchema
>;
export type PublicCheckoutResponse = z.infer<
	typeof publicCheckoutResponseSchema
>;
export type PublicPaymentAttempt = z.infer<typeof publicPaymentAttemptSchema>;
export type PublicPaymentStatus = z.infer<typeof publicPaymentStatusSchema>;
export type PublicCheckoutReturn = z.infer<typeof publicCheckoutReturnSchema>;
export type StoredPublicPaymentConfirmation = z.infer<
	typeof storedPublicPaymentConfirmationSchema
>;
export type CurrentPublicPaymentConfirmation = z.infer<
	typeof currentPublicPaymentConfirmationSchema
>;
