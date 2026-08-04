/// <reference lib="dom" />

import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PublicCartItem } from "../src/features/public-cart/contracts/public-cart.schemas";
import { PublicReservationAvailabilityStep } from "../src/features/public-reservation/components/PublicReservationAvailabilityStep";
import { PublicReservationCountdown } from "../src/features/public-reservation/components/PublicReservationCountdown";
import { PublicReservationCustomerStep } from "../src/features/public-reservation/components/PublicReservationCustomerStep";
import { PublicReservationReview } from "../src/features/public-reservation/components/PublicReservationReview";
import { PublicReservationSummary } from "../src/features/public-reservation/components/PublicReservationSummary";
import { PublicReservationTimeStep } from "../src/features/public-reservation/components/PublicReservationTimeStep";
import type { TemporaryReservationResponse } from "../src/features/public-reservation/contracts/public-reservation.schemas";

const minDate = new Date(Date.UTC(2026, 7, 4, 12));
const maxDate = new Date(Date.UTC(2026, 7, 11, 12));
const items: PublicCartItem[] = [
	{
		dishId: "dish-1",
		name: "Ceviche clásico",
		imageUrl: null,
		unitPrice: "42.50",
		quantity: 2,
		availability: "available",
		priceChanged: false,
	},
];

const reservation: TemporaryReservationResponse = {
	id: "123e4567-e89b-12d3-a456-426614174000",
	branchSlug: "miraflores",
	status: "pending_payment",
	date: "2026-08-04",
	startTime: "19:30",
	endTime: "21:00",
	timezone: "America/Lima",
	durationMinutes: 90,
	expiresAt: "2099-08-04T20:00:00-05:00",
	partySize: 2,
	customer: {
		fullName: "Ana Pérez",
		email: "ana@example.com",
		phone: "+51987654321",
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
	currency: "PEN",
	total: "85.00",
	checkoutToken: "secret-token",
	createdAt: "2099-08-04T19:45:00-05:00",
};

describe("public reservation UI", () => {
	test("blocks availability search until the party size is valid", async () => {
		const onSearch = () => {};
		const view = render(
			<PublicReservationAvailabilityStep
				date="2026-08-04"
				maxDate={maxDate}
				maxPartySize={6}
				minDate={minDate}
				onDateChange={() => {}}
				onPartySizeChange={() => {}}
				onSearch={onSearch}
				partySize=""
			/>,
		);

		const search = screen.getByRole("button", { name: "Ver horarios" });
		expect((search as HTMLButtonElement).disabled).toBe(true);
		view.rerender(
			<PublicReservationAvailabilityStep
				date="2026-08-04"
				maxDate={maxDate}
				maxPartySize={6}
				minDate={minDate}
				onDateChange={() => {}}
				onPartySizeChange={() => {}}
				onSearch={onSearch}
				partySize={2}
			/>,
		);
		expect(
			(
				screen.getByRole("button", {
					name: "Ver horarios",
				}) as HTMLButtonElement
			).disabled,
		).toBe(false);
	});

	test("renders available times as a single keyboard-operable selection", async () => {
		const user = userEvent.setup();
		const selected: string[] = [];
		render(
			<PublicReservationTimeStep
				availableTimes={["19:30", "20:00"]}
				hasSearched
				onSelect={(time) => selected.push(time)}
				selectedTime=""
			/>,
		);

		const time = screen.getByRole("radio", { name: "Reservar a las 19:30" });
		await user.click(time);
		expect(selected).toEqual(["19:30"]);
		expect(screen.getByRole("radiogroup")).toBeTruthy();
	});

	test("focuses the first customer field and normalizes valid data", async () => {
		const user = userEvent.setup();
		const submitted: unknown[] = [];
		render(
			<PublicReservationCustomerStep
				onSubmit={(value) => {
					submitted.push(value);
				}}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Revisar reserva" }));
		expect(document.activeElement).toBe(
			screen.getByLabelText("Nombre completo"),
		);

		await user.type(screen.getByLabelText("Nombre completo"), " Ana Pérez ");
		await user.type(screen.getByLabelText("Email"), "ANA@EXAMPLE.COM");
		await user.type(screen.getByLabelText("Teléfono"), "+51 987-654-321");
		await user.click(screen.getByRole("button", { name: "Revisar reserva" }));

		expect(submitted).toEqual([
			{
				fullName: "Ana Pérez",
				email: "ana@example.com",
				phone: "+51987654321",
			},
		]);
	});

	test("disables review confirmation when an item is unavailable", () => {
		render(
			<PublicReservationReview
				branchName="Miraflores"
				date="2026-08-04"
				items={[{ ...items[0], availability: "sold_out" }]}
				onConfirm={() => {}}
				partySize={2}
				time="19:30"
			/>,
		);

		expect(
			(
				screen.getByRole("button", {
					name: "Crear reserva temporal",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		expect(screen.getByText("Actualiza tu selección")).toBeTruthy();
	});

	test("shows an expired countdown and invokes expiration callback", () => {
		const expired: boolean[] = [];
		const expiresAt = new Date(Date.now() - 60_000).toISOString();
		const createdAt = new Date(Date.now() - 120_000).toISOString();
		render(
			<PublicReservationCountdown
				createdAt={createdAt}
				expiresAt={expiresAt}
				onExpire={() => expired.push(true)}
			/>,
		);

		expect(screen.getByText("Reserva vencida")).toBeTruthy();
		expect(expired).toEqual([true]);
	});

	test("keeps payment disabled and does not render checkout token", () => {
		render(
			<PublicReservationSummary
				branchName="Miraflores"
				onExpired={() => {}}
				reservation={reservation}
			/>,
		);

		expect(
			(
				screen.getByRole("button", {
					name: "Continuar al pago",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		expect(screen.queryByText("secret-token")).toBeNull();
		expect(screen.getByText("Pendiente de pago")).toBeTruthy();
	});
});
