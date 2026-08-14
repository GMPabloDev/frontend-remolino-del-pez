import { z } from "zod";

import { publicSlugSchema } from "../../public-discovery/contracts/public-discovery.schemas";
import {
	RESERVATION_TIMEZONE,
	reservationMoneySchema,
} from "../../public-reservation/contracts/public-reservation.schemas";

const pdfFileNameSchema = z
	.string()
	.min(1)
	.max(255)
	.refine((value) => !value.includes("/") && !value.includes("\\"))
	.refine((value) => value.toLowerCase().endsWith(".pdf"));

export const customerReceiptStatusSchema = z.enum([
	"pending",
	"available",
	"failed",
]);

export const customerReservationReceiptSchema = z
	.object({
		number: z.string().min(1),
		status: customerReceiptStatusSchema,
		generatedAt: z.iso.datetime({ offset: true }).nullable(),
	})
	.superRefine((receipt, context) => {
		if (receipt.status === "available" && !receipt.generatedAt) {
			context.addIssue({
				code: "custom",
				path: ["generatedAt"],
				message: "Un comprobante disponible debe tener fecha de generación.",
			});
		}
	});

export const customerReservationItemSchema = z.object({
	dishId: z.uuid(),
	name: z.string().min(1),
	unitPrice: reservationMoneySchema,
	quantity: z.number().int().positive(),
	subtotal: reservationMoneySchema,
});

export const customerReservationSchema = z.object({
	id: z.uuid(),
	status: z.literal("confirmed"),
	branch: z.object({
		slug: publicSlugSchema,
		name: z.string().min(1),
		address: z.string().min(1),
		district: z.string().min(1),
		province: z.string().min(1),
		department: z.string().min(1),
	}),
	startAt: z.iso.datetime({ offset: true }),
	endAt: z.iso.datetime({ offset: true }),
	timezone: z.literal(RESERVATION_TIMEZONE),
	partySize: z.number().int().positive(),
	items: z.array(customerReservationItemSchema),
	currency: z.literal("PEN"),
	total: reservationMoneySchema,
	confirmedAt: z.iso.datetime({ offset: true }),
	receipt: customerReservationReceiptSchema.nullable(),
});

export const customerReservationHistorySchema = z.array(
	customerReservationSchema,
);

export const customerReceiptDownloadSchema = z
	.object({
		fileName: pdfFileNameSchema,
		downloadUrl: z.url(),
		expiresAt: z.iso.datetime({ offset: true }),
	})
	.superRefine((download, context) => {
		if (new URL(download.downloadUrl).protocol !== "https:") {
			context.addIssue({
				code: "custom",
				path: ["downloadUrl"],
				message: "La URL de descarga debe usar HTTPS.",
			});
		}
	});

export type CustomerReceiptStatus = z.infer<typeof customerReceiptStatusSchema>;
export type CustomerReservationReceipt = z.infer<
	typeof customerReservationReceiptSchema
>;
export type CustomerReservationItem = z.infer<
	typeof customerReservationItemSchema
>;
export type CustomerReservation = z.infer<typeof customerReservationSchema>;
export type CustomerReceiptDownload = z.infer<
	typeof customerReceiptDownloadSchema
>;

export function isCustomerReceiptDownloadUsable(
	download: CustomerReceiptDownload,
	now = Date.now(),
): boolean {
	return new Date(download.expiresAt).getTime() > now;
}
