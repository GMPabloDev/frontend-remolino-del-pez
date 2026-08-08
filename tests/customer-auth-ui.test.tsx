/// <reference lib="dom" />

import { describe, expect, test } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CustomerAccessForm } from "../src/features/customer-auth/components/CustomerAccessForm";
import { ApiClientError } from "../src/lib/api/api-error";

function renderForm(onSubmit: (input: { email: string }) => Promise<void>) {
	render(<CustomerAccessForm onSubmit={onSubmit} />);

	return {
		email: screen.getByLabelText("Email"),
		submit: screen.getByRole("button", {
			name: "Solicitar enlace de acceso",
		}),
	};
}

describe("CustomerAccessForm", () => {
	test("focuses the email field when validation fails", async () => {
		const user = userEvent.setup();
		const calls: Array<{ email: string }> = [];
		const form = renderForm(async (input) => {
			calls.push(input);
		});

		await user.click(form.submit);

		expect(calls).toHaveLength(0);
		expect(document.activeElement).toBe(form.email);
		expect(screen.getByText("Ingresa un email válido.")).toBeTruthy();
	});

	test("normalizes email and shows the generic accepted message", async () => {
		const user = userEvent.setup();
		const calls: Array<{ email: string }> = [];
		const form = renderForm(async (input) => {
			calls.push(input);
		});

		await user.type(form.email, " ANA@EXAMPLE.COM ");
		await user.click(form.submit);

		await waitFor(() => expect(calls).toHaveLength(1));
		expect(calls[0]).toEqual({ email: "ana@example.com" });
		expect(screen.getByText("Solicitud recibida")).toBeTruthy();
		expect(screen.getByText(/Si existe una cuenta elegible/)).toBeTruthy();
		expect(screen.getByRole("button", { name: /Espera/ })).toHaveProperty(
			"disabled",
			true,
		);
	});

	test("focuses a persistent generic error after a network failure", async () => {
		const user = userEvent.setup();
		const form = renderForm(async () => {
			throw new ApiClientError(0, "NETWORK_ERROR", "network");
		});

		await user.type(form.email, "ana@example.com");
		await user.click(form.submit);

		const error = await screen.findByRole("alert");
		expect(error.textContent).toContain("No se pudo conectar con el servidor");
		expect(document.activeElement).toBe(error);
		expect(error.textContent).not.toContain("token");
	});
});
