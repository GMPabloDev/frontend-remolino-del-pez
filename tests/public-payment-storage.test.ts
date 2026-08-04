import { describe, expect, test } from "bun:test";
import {
	currentPublicPaymentConfirmationSchema,
	publicCheckoutReturnSchema,
} from "../src/features/public-payment/contracts/public-payment.schemas";
import type { PublicPaymentStorageAdapter } from "../src/features/public-payment/lib/public-payment-storage";
import {
	getPublicPaymentConfirmationKey,
	readCurrentPublicPaymentConfirmation,
	readPublicCheckoutReturn,
	readPublicPaymentConfirmation,
	writeCurrentPublicPaymentConfirmation,
	writePublicCheckoutReturn,
	writePublicPaymentConfirmation,
} from "../src/features/public-payment/lib/public-payment-storage";

class MemoryStorage implements PublicPaymentStorageAdapter {
	private readonly values = new Map<string, string>();

	getItem(key: string) {
		return this.values.get(key) ?? null;
	}

	setItem(key: string, value: string) {
		this.values.set(key, value);
	}

	removeItem(key: string) {
		this.values.delete(key);
	}

	keys() {
		return [...this.values.keys()];
	}
}

const storageContext = {
	restaurantSlug: "molino-del-pez",
	branchSlug: "miraflores",
	reservationId: "123e4567-e89b-12d3-a456-426614174000",
	paymentAttemptId: "123e4567-e89b-12d3-a456-426614174001",
	reservationExpiresAt: "2099-08-04T20:00:00-05:00",
};

const confirmation = {
	version: 1 as const,
	restaurantSlug: storageContext.restaurantSlug,
	branchSlug: storageContext.branchSlug,
	id: storageContext.reservationId,
	status: "confirmed" as const,
	date: "2099-08-04",
	startTime: "19:30",
	endTime: "21:00",
	timezone: "America/Lima" as const,
	durationMinutes: 90,
	expiresAt: storageContext.reservationExpiresAt,
	partySize: 2,
	items: [
		{
			dishId: "123e4567-e89b-12d3-a456-426614174002",
			name: "Ceviche clásico",
			unitPrice: "42.50",
			quantity: 2,
			subtotal: "85.00",
		},
	],
	currency: "PEN" as const,
	total: "85.00",
	createdAt: "2099-08-04T19:00:00-05:00",
	confirmedAt: "2099-08-04T19:10:00-05:00",
	savedAt: "2099-08-04T19:10:01-05:00",
};

describe("public payment storage", () => {
	test("writes and restores the return marker without secrets", () => {
		const storage = new MemoryStorage();
		const marker = publicCheckoutReturnSchema.parse({
			version: 1,
			...storageContext,
			initiatedAt: "2099-08-04T19:01:00-05:00",
		});

		expect(writePublicCheckoutReturn(marker, { storage }).persistence).toBe(
			"persistent",
		);
		expect(readPublicCheckoutReturn({ storage }).value).toEqual(marker);
		expect(JSON.stringify(storage.keys())).not.toContain("checkoutToken");
	});

	test("removes corrupt and expired return markers", () => {
		const storage = new MemoryStorage();
		storage.setItem("public-checkout-return:v1", "not-json");
		expect(readPublicCheckoutReturn({ storage }).reason).toBe("invalid");
		expect(storage.getItem("public-checkout-return:v1")).toBeNull();

		const marker = publicCheckoutReturnSchema.parse({
			version: 1,
			...storageContext,
			initiatedAt: "2099-08-04T19:01:00-05:00",
		});
		writePublicCheckoutReturn(marker, { storage });
		expect(
			readPublicCheckoutReturn({
				storage,
				now: new Date("2099-08-04T20:01:00-05:00"),
			}).reason,
		).toBe("expired");
	});

	test("restores only the confirmation referenced by the current pointer", () => {
		const storage = new MemoryStorage();
		const confirmationWrite = writePublicPaymentConfirmation(confirmation, {
			storage,
		});
		const confirmationKey = getPublicPaymentConfirmationKey(
			confirmation.restaurantSlug,
			confirmation.branchSlug,
		);
		const pointer = currentPublicPaymentConfirmationSchema.parse({
			version: 1,
			restaurantSlug: confirmation.restaurantSlug,
			branchSlug: confirmation.branchSlug,
			reservationId: confirmation.id,
			confirmationKey,
			savedAt: confirmation.savedAt,
		});

		expect(confirmationWrite.persistence).toBe("persistent");
		expect(
			writeCurrentPublicPaymentConfirmation(pointer, { storage }).persistence,
		).toBe("persistent");
		expect(readCurrentPublicPaymentConfirmation({ storage }).value).toEqual(
			pointer,
		);
		expect(
			readPublicPaymentConfirmation(
				confirmation.restaurantSlug,
				confirmation.branchSlug,
				{ storage },
			).value,
		).toEqual(confirmation);
		const rawConfirmation = storage.getItem(confirmationKey) ?? "";
		expect(rawConfirmation).not.toContain("checkoutToken");
		expect(rawConfirmation).not.toContain("customer");
	});

	test("rejects a pointer to an arbitrary confirmation key", () => {
		const storage = new MemoryStorage();
		const pointer = {
			version: 1 as const,
			restaurantSlug: storageContext.restaurantSlug,
			branchSlug: storageContext.branchSlug,
			reservationId: storageContext.reservationId,
			confirmationKey: "public-payment-confirmation:v1:other:branch",
			savedAt: "2099-08-04T19:10:01-05:00",
		};
		expect(
			writeCurrentPublicPaymentConfirmation(pointer, { storage }).reason,
		).toBe("invalid");
	});

	test("keeps a valid value in memory when storage is unavailable", () => {
		const result = writePublicPaymentConfirmation(confirmation, {
			storage: null,
		});
		expect(result.persistence).toBe("memory");
		expect(result.value).toEqual(confirmation);
	});
});
