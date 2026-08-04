/// <reference lib="dom" />

import { describe, expect, test } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublicCheckoutButton } from "../src/features/public-payment/components/PublicCheckoutButton";
import { PublicPaymentConfirmation } from "../src/features/public-payment/components/PublicPaymentConfirmation";
import { PublicPaymentResultState } from "../src/features/public-payment/components/PublicPaymentResultState";
import { PublicPaymentWaiting } from "../src/features/public-payment/components/PublicPaymentWaiting";
import type { StoredPublicPaymentConfirmation } from "../src/features/public-payment/contracts/public-payment.schemas";

const confirmation: StoredPublicPaymentConfirmation = {
	version: 1,
	restaurantSlug: "molino-del-pez",
	branchSlug: "miraflores",
	id: "123e4567-e89b-12d3-a456-426614174000",
	status: "confirmed",
	date: "2099-08-04",
	startTime: "19:30",
	endTime: "21:00",
	timezone: "America/Lima",
	durationMinutes: 90,
	expiresAt: "2099-08-04T20:00:00-05:00",
	partySize: 2,
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
	createdAt: "2099-08-04T19:00:00-05:00",
	confirmedAt: "2099-08-04T19:10:00-05:00",
	savedAt: "2099-08-04T19:10:01-05:00",
};

describe("public payment UI", () => {
	test("blocks duplicate checkout activation while pending", async () => {
		const user = userEvent.setup();
		let activations = 0;
		const view = render(
			<PublicCheckoutButton isPending onClick={() => (activations += 1)} />,
		);

		const button = screen.getByRole("button", { name: /Preparando el pago/i });
		expect((button as HTMLButtonElement).disabled).toBe(true);
		await user.click(button);
		expect(activations).toBe(0);
		view.rerender(<PublicCheckoutButton onClick={() => (activations += 1)} />);
		await user.click(screen.getByRole("button", { name: "Continuar al pago" }));
		expect(activations).toBe(1);
	});

	test("keeps waiting retry accessible and disabled while consulting", async () => {
		const user = userEvent.setup();
		let retries = 0;
		render(
			<PublicPaymentWaiting
				isRetrying
				onRetry={() => (retries += 1)}
				message="Esperando el webhook."
			/>,
		);

		const retry = screen.getByRole("button", { name: "Consultar ahora" });
		expect((retry as HTMLButtonElement).disabled).toBe(true);
		await user.click(retry);
		expect(retries).toBe(0);
	});

	test("renders recoverable result actions and moves focus to the state", async () => {
		const user = userEvent.setup();
		let retryCount = 0;
		let menuCount = 0;
		render(
			<PublicPaymentResultState
				description="Tu reserva sigue vigente."
				onPrimaryAction={() => (retryCount += 1)}
				primaryActionLabel="Intentar pago nuevamente"
				onSecondaryAction={() => (menuCount += 1)}
				secondaryActionLabel="Volver al menú"
				title="El intento terminó"
			/>,
		);

		await waitFor(() =>
			expect(document.activeElement).toBe(screen.getByRole("region")),
		);
		await user.click(
			screen.getByRole("button", { name: "Intentar pago nuevamente" }),
		);
		await user.click(screen.getByRole("button", { name: "Volver al menú" }));
		expect(retryCount).toBe(1);
		expect(menuCount).toBe(1);
	});

	test("shows confirmed summary, degraded storage warning and safe actions", async () => {
		const user = userEvent.setup();
		let menuCount = 0;
		let homeCount = 0;
		render(
			<PublicPaymentConfirmation
				branchName="Sucursal Miraflores"
				confirmation={confirmation}
				onGoHome={() => (homeCount += 1)}
				onReturnToMenu={() => (menuCount += 1)}
				storageWarning
			/>,
		);

		expect(screen.getByText("Sucursal Miraflores")).toBeTruthy();
		expect(screen.getByText("Ceviche clásico")).toBeTruthy();
		expect(screen.getByText("No pudimos guardar este resumen")).toBeTruthy();
		expect(screen.queryByText("opaque-token")).toBeNull();
		expect(screen.queryByText("ana@example.com")).toBeNull();
		await user.click(screen.getByRole("button", { name: "Volver al menú" }));
		await user.click(screen.getByRole("button", { name: "Ir al inicio" }));
		expect(menuCount).toBe(1);
		expect(homeCount).toBe(1);
	});
});
