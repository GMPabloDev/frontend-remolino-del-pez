import { z } from "zod";
import { storedPublicCartSchema } from "../../public-cart/contracts/public-cart.schemas";
import { publicSlugSchema } from "../../public-discovery/contracts/public-discovery.schemas";

export const RESERVATION_TIMEZONE = "America/Lima" as const;

const CALENDAR_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const RESERVATION_TIME_REGEX = /^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/;
const RESERVATION_END_TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const E164_PHONE_REGEX = /^\+\d{8,15}$/;
const RESERVATION_MONEY_REGEX = /^\d{1,8}\.\d{2}$/;

export function isValidCalendarDate(value: string): boolean {
	if (!CALENDAR_DATE_REGEX.test(value)) return false;

	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));

	return (
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
	);
}

export const reservationDateSchema = z
	.string()
	.regex(CALENDAR_DATE_REGEX, "La fecha debe tener el formato YYYY-MM-DD.")
	.refine(isValidCalendarDate, "La fecha no es válida.");

export const reservationTimeSchema = z
	.string()
	.regex(RESERVATION_TIME_REGEX, "La hora debe usar minutos 00, 15, 30 o 45.");

export const reservationEndTimeSchema = z
	.string()
	.regex(RESERVATION_END_TIME_REGEX, "La hora de término no es válida.");

export const reservationMoneySchema = z
	.string()
	.regex(RESERVATION_MONEY_REGEX, "El monto debe tener dos decimales.");

export const reservationCustomerSchema = z
	.object({
		fullName: z.string().trim().min(2).max(150),
		email: z
			.string()
			.trim()
			.max(320)
			.pipe(z.email())
			.transform((value) => value.toLowerCase()),
		phone: z
			.string()
			.trim()
			.transform(normalizeReservationPhone)
			.pipe(z.string().regex(E164_PHONE_REGEX)),
	})
	.strict();

export const availabilityRequestSchema = z.object({
	date: reservationDateSchema,
	partySize: z.number().int().positive(),
});

export const publicAvailabilitySchema = z.object({
	date: reservationDateSchema,
	timezone: z.literal(RESERVATION_TIMEZONE),
	durationMinutes: z.number().int().positive(),
	availableTimes: z.array(reservationTimeSchema),
});

export const temporaryReservationItemRequestSchema = z
	.object({
		dishId: z.uuid(),
		quantity: z.number().int().min(1).max(99),
	})
	.strict();

export const createTemporaryReservationRequestSchema = z
	.object({
		date: reservationDateSchema,
		time: reservationTimeSchema,
		partySize: z.number().int().positive(),
		customer: reservationCustomerSchema,
		items: z.array(temporaryReservationItemRequestSchema).min(1).max(50),
	})
	.strict()
	.superRefine((request, context) => {
		const dishIds = new Set<string>();

		for (const [index, item] of request.items.entries()) {
			if (dishIds.has(item.dishId)) {
				context.addIssue({
					code: "custom",
					path: ["items", index, "dishId"],
					message: "El plato no puede repetirse.",
				});
			}

			dishIds.add(item.dishId);
		}
	});

export const temporaryReservationItemSchema = z.object({
	dishId: z.uuid(),
	name: z.string().min(1),
	unitPrice: reservationMoneySchema,
	quantity: z.number().int().min(1).max(99),
	subtotal: reservationMoneySchema,
});

export const temporaryReservationResponseSchema = z.object({
	id: z.uuid(),
	branchSlug: publicSlugSchema,
	status: z.literal("pending_payment"),
	date: reservationDateSchema,
	startTime: reservationTimeSchema,
	endTime: reservationEndTimeSchema,
	timezone: z.literal(RESERVATION_TIMEZONE),
	durationMinutes: z.number().int().positive(),
	expiresAt: z.iso.datetime({ offset: true }),
	partySize: z.number().int().positive(),
	customer: reservationCustomerSchema,
	items: z.array(temporaryReservationItemSchema).min(1).max(50),
	currency: z.literal("PEN"),
	total: reservationMoneySchema,
	checkoutToken: z.string().min(1),
	createdAt: z.iso.datetime({ offset: true }),
});

export const storedPublicReservationSchema = temporaryReservationResponseSchema
	.omit({ customer: true })
	.extend({
		version: z.literal(1),
		restaurantSlug: publicSlugSchema,
		savedAt: z.iso.datetime({ offset: true }),
	});

export const publicReservationCartHandoffSchema = z.object({
	version: z.literal(1),
	restaurantSlug: publicSlugSchema,
	branchSlug: publicSlugSchema,
	createdAt: z.iso.datetime({ offset: true }),
	cart: storedPublicCartSchema,
});

export const reservationAttemptSchema = z.object({
	idempotencyKey: z.uuid(),
	payload: createTemporaryReservationRequestSchema,
});

export type AvailabilityRequest = z.infer<typeof availabilityRequestSchema>;
export type PublicAvailability = z.infer<typeof publicAvailabilitySchema>;
export type ReservationCustomer = z.infer<typeof reservationCustomerSchema>;
export type CreateTemporaryReservationRequest = z.infer<
	typeof createTemporaryReservationRequestSchema
>;
export type TemporaryReservationItem = z.infer<
	typeof temporaryReservationItemSchema
>;
export type TemporaryReservationResponse = z.infer<
	typeof temporaryReservationResponseSchema
>;
export type StoredPublicReservation = z.infer<
	typeof storedPublicReservationSchema
>;
export type PublicReservationCartHandoff = z.infer<
	typeof publicReservationCartHandoffSchema
>;
export type ReservationAttempt = z.infer<typeof reservationAttemptSchema>;

export function normalizeReservationPhone(value: string): string {
	return value.replace(/[\s-]/g, "");
}
