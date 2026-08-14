import type { CustomerReservation } from "../contracts/customer-reservation.schemas";

const reservationDateFormatter = new Intl.DateTimeFormat("es-PE", {
	dateStyle: "full",
	timeZone: "America/Lima",
});

const reservationTimeFormatter = new Intl.DateTimeFormat("es-PE", {
	hour: "2-digit",
	minute: "2-digit",
	timeZone: "America/Lima",
});

const reservationMoneyFormatter = new Intl.NumberFormat("es-PE", {
	style: "currency",
	currency: "PEN",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export interface CustomerReservationGroups {
	upcoming: CustomerReservation[];
	past: CustomerReservation[];
}

export function groupCustomerReservations(
	reservations: CustomerReservation[],
	now = Date.now(),
): CustomerReservationGroups {
	return reservations.reduce<CustomerReservationGroups>(
		(groups, reservation) => {
			if (new Date(reservation.endAt).getTime() >= now) {
				groups.upcoming.push(reservation);
			} else {
				groups.past.push(reservation);
			}

			return groups;
		},
		{ upcoming: [], past: [] },
	);
}

export function formatCustomerReservationDate(value: string): string {
	return reservationDateFormatter.format(new Date(value));
}

export function formatCustomerReservationTime(value: string): string {
	return reservationTimeFormatter.format(new Date(value));
}

export function formatCustomerReservationTimeRange(
	startAt: string,
	endAt: string,
): string {
	return `${formatCustomerReservationTime(startAt)} – ${formatCustomerReservationTime(endAt)}`;
}

export function formatCustomerReservationMoney(value: string): string {
	const [wholePart, decimalPart] = value.split(".");
	const cents = Number(wholePart) * 100 + Number(decimalPart);
	return reservationMoneyFormatter.format(cents / 100);
}
