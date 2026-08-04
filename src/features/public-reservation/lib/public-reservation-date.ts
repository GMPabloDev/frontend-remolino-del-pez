import {
	isValidCalendarDate,
	RESERVATION_TIMEZONE,
} from "../contracts/public-reservation.schemas";

const CALENDAR_DATE_PARTS = new Intl.DateTimeFormat("en-US", {
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
});

export interface ReservationDateBounds {
	minDate: Date;
	maxDate: Date;
	minValue: string;
	maxValue: string;
}

export function formatReservationDate(
	value: Date,
	timeZone = RESERVATION_TIMEZONE,
): string {
	const parts = new Intl.DateTimeFormat("en-US", {
		day: "2-digit",
		month: "2-digit",
		timeZone,
		year: "numeric",
	}).formatToParts(value);
	const values = Object.fromEntries(
		parts
			.filter((part) => part.type !== "literal")
			.map((part) => [part.type, part.value]),
	);

	return `${values.year}-${values.month}-${values.day}`;
}

export function getCurrentReservationDate(now = new Date()): string {
	return formatReservationDate(now);
}

export function formatReservationDateLabel(value: Date): string {
	return new Intl.DateTimeFormat("es-PE", {
		dateStyle: "long",
		timeZone: RESERVATION_TIMEZONE,
	}).format(value);
}

export function getReservationDateBounds(
	maximumAdvanceDays: number,
	now = new Date(),
): ReservationDateBounds {
	if (!Number.isInteger(maximumAdvanceDays) || maximumAdvanceDays < 1) {
		throw new Error("maximumAdvanceDays must be a positive integer.");
	}

	const minValue = getCurrentReservationDate(now);
	const maxValue = addReservationDays(minValue, maximumAdvanceDays);

	return {
		minDate: reservationDateToCalendarDate(minValue),
		maxDate: reservationDateToCalendarDate(maxValue),
		minValue,
		maxValue,
	};
}

export function reservationDateToCalendarDate(value: string): Date {
	if (!isValidCalendarDate(value)) {
		throw new Error("Invalid reservation calendar date.");
	}

	const [year, month, day] = value.split("-").map(Number);
	return new Date(Date.UTC(year, month - 1, day, 12));
}

export function calendarDateToReservationDate(value: Date): string {
	const parts = CALENDAR_DATE_PARTS.formatToParts(value);
	const values = Object.fromEntries(
		parts
			.filter((part) => part.type !== "literal")
			.map((part) => [part.type, part.value]),
	);

	return `${values.year}-${values.month}-${values.day}`;
}

export function addReservationDays(value: string, days: number): string {
	if (!isValidCalendarDate(value) || !Number.isInteger(days)) {
		throw new Error("Invalid reservation date or day offset.");
	}

	const [year, month, day] = value.split("-").map(Number);
	const result = new Date(Date.UTC(year, month - 1, day + days, 12));
	return calendarDateToReservationDate(result);
}

export function isReservationDateInBounds(
	value: string,
	bounds: Pick<ReservationDateBounds, "minValue" | "maxValue">,
): boolean {
	return (
		isValidCalendarDate(value) &&
		value >= bounds.minValue &&
		value <= bounds.maxValue
	);
}
