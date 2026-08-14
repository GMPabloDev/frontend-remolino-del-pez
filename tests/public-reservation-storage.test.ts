import { describe, expect, test } from "bun:test";

import {
	createStoredPublicReservation,
	getPublicReservationKey,
	readPublicReservation,
	writePublicReservation,
} from "../src/features/public-reservation/lib/public-reservation-storage";

class MemoryStorage {
	private values = new Map<string, string>();

	getItem(key: string): string | null {
		return this.values.get(key) ?? null;
	}

	setItem(key: string, value: string): void {
		this.values.set(key, value);
	}

	removeItem(key: string): void {
		this.values.delete(key);
	}
}

const reservation = {
	id: "123e4567-e89b-12d3-a456-426614174000",
	branchSlug: "miraflores",
	status: "pending_payment" as const,
	date: "2026-08-04",
	startTime: "19:30" as const,
	endTime: "21:00" as const,
	timezone: "America/Lima" as const,
	durationMinutes: 90,
	expiresAt: "2026-08-04T20:00:00-05:00",
	partySize: 2,
	customer: {
		fullName: "Ana Pérez",
		email: "ana@example.com",
		phone: "+51987654321",
	},
	billingDocument: {
		type: "BOLETA" as const,
		documentNumber: "12345678",
	},
	items: [
		{
			dishId: "123e4567-e89b-12d3-a456-426614174001",
			name: "Ceviche clásico",
			unitPrice: "42.50",
			quantity: 2,
			subtotal: "85.00",
		},
	],
	currency: "PEN" as const,
	total: "85.00",
	checkoutToken: "sensitive-token",
	createdAt: "2026-08-04T19:30:00-05:00",
};

const now = new Date("2026-08-04T19:35:00-05:00");
const restaurantSlug = "restaurante-olimpico";
const branchSlug = "miraflores";

describe("public reservation storage", () => {
	test("isolates reservations by context and omits PII", () => {
		const storage = new MemoryStorage();
		const stored = createStoredPublicReservation(
			restaurantSlug,
			branchSlug,
			reservation,
			now,
		);

		writePublicReservation(stored, { storage });
		const result = readPublicReservation(restaurantSlug, branchSlug, {
			now,
			storage,
		});

		expect(result.reason).toBe("available");
		expect(result.value).not.toHaveProperty("customer");
		expect(result.value).not.toHaveProperty("billingDocument");
		const storedValue = storage.getItem(
			getPublicReservationKey(restaurantSlug, branchSlug),
		);
		expect(storedValue).not.toContain("Ana Pérez");
		expect(storedValue).not.toContain("12345678");
		expect(
			readPublicReservation("other-restaurant", branchSlug, { now, storage })
				.value,
		).toBeNull();
	});

	test("removes expired and corrupt reservations", () => {
		const storage = new MemoryStorage();
		const stored = createStoredPublicReservation(
			restaurantSlug,
			branchSlug,
			reservation,
			now,
		);
		writePublicReservation(stored, { storage });

		expect(
			readPublicReservation(restaurantSlug, branchSlug, {
				now: new Date("2026-08-04T20:00:00-05:00"),
				storage,
			}).reason,
		).toBe("expired");

		storage.setItem(
			getPublicReservationKey(restaurantSlug, branchSlug),
			"not-json",
		);
		expect(
			readPublicReservation(restaurantSlug, branchSlug, { now, storage })
				.reason,
		).toBe("invalid");
	});
});
