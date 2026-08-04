import { describe, expect, test } from "bun:test";

import {
	addReservationDays,
	calendarDateToReservationDate,
	formatReservationDate,
	getReservationDateBounds,
	isReservationDateInBounds,
} from "../src/features/public-reservation/lib/public-reservation-date";
import {
	areReservationPayloadsEqual,
	getReservationAttemptForPayload,
} from "../src/features/public-reservation/lib/public-reservation-idempotency";

const customer = {
	fullName: "Ana Pérez",
	email: "ana@example.com",
	phone: "+51987654321",
};

const firstPayload = {
	date: "2026-08-04",
	time: "19:30" as const,
	partySize: 2,
	customer,
	items: [
		{
			dishId: "123e4567-e89b-12d3-a456-426614174001",
			quantity: 2,
		},
	],
};

describe("public reservation dates", () => {
	test("formats dates in Lima without shifting the calendar day", () => {
		expect(formatReservationDate(new Date("2026-08-04T04:00:00.000Z"))).toBe(
			"2026-08-03",
		);
		expect(addReservationDays("2026-02-28", 1)).toBe("2026-03-01");
		expect(
			calendarDateToReservationDate(new Date(Date.UTC(2026, 7, 4, 12))),
		).toBe("2026-08-04");
	});

	test("builds inclusive advance bounds", () => {
		const bounds = getReservationDateBounds(
			7,
			new Date("2026-08-04T15:00:00.000Z"),
		);
		expect(bounds.minValue).toBe("2026-08-04");
		expect(bounds.maxValue).toBe("2026-08-11");
		expect(isReservationDateInBounds("2026-08-11", bounds)).toBe(true);
		expect(isReservationDateInBounds("2026-08-12", bounds)).toBe(false);
	});
});

describe("public reservation idempotency", () => {
	test("reuses a key only for the same normalized payload", () => {
		const firstAttempt = getReservationAttemptForPayload(firstPayload);
		const reorderedPayload = {
			...firstPayload,
			items: [...firstPayload.items].reverse(),
		};
		const replayAttempt = getReservationAttemptForPayload(
			reorderedPayload,
			firstAttempt,
		);
		const changedAttempt = getReservationAttemptForPayload(
			{ ...firstPayload, partySize: 3 },
			firstAttempt,
		);

		expect(replayAttempt.idempotencyKey).toBe(firstAttempt.idempotencyKey);
		expect(changedAttempt.idempotencyKey).not.toBe(firstAttempt.idempotencyKey);
		expect(areReservationPayloadsEqual(firstPayload, reorderedPayload)).toBe(
			true,
		);
	});
});
