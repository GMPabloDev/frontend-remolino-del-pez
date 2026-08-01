import { z } from "zod";

const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const staffRestaurantSchema = z.object({
	id: z.uuid(),
	slug: z.string().trim().min(1),
	name: z.string().trim().min(1),
	legalName: z.string().trim().min(1),
	taxId: z.string().regex(/^\d{11}$/),
	phone: z.string().nullable(),
	email: z.email().nullable(),
	timezone: z.literal("America/Lima"),
	createdAt: isoDateTimeSchema,
	updatedAt: isoDateTimeSchema,
});

export type StaffRestaurant = z.infer<typeof staffRestaurantSchema>;
