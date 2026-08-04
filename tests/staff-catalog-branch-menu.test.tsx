/// <reference lib="dom" />

import { afterEach, describe, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

import { Toaster } from "../src/components/ui/sonner";
import type { StaffSessionAccess } from "../src/features/staff-auth/session/staff-session";
import { StaffBranchDishConfigurationForm } from "../src/features/staff-catalog/components/StaffBranchDishConfigurationForm";
import type { StaffBranchDish } from "../src/features/staff-catalog/contracts/staff-catalog.schemas";
import { StaffUnsavedChangesProvider } from "../src/features/staff-shell/components/StaffUnsavedChangesProvider";

const originalFetch = globalThis.fetch;
const branchId = "00000000-0000-4000-8000-000000000002";
const dishId = "00000000-0000-4000-8000-000000000003";
const restaurantId = "00000000-0000-4000-8000-000000000001";
const session: StaffSessionAccess = {
	getAccessToken: () => "access-token",
	refreshAccessToken: async () => "access-token",
	invalidateSession: () => undefined,
};
const dish: StaffBranchDish = {
	id: dishId,
	restaurantId,
	categoryId: "00000000-0000-4000-8000-000000000004",
	categoryName: "Fondos",
	name: "Arroz con pato",
	description: "Arroz con pato al estilo norteño.",
	imageUrl: null,
	ingredients: ["Arroz", "Pato"],
	allergens: ["Gluten"],
	position: 1,
	status: "active",
	createdAt: "2026-08-01T00:00:00.000Z",
	updatedAt: "2026-08-02T00:00:00.000Z",
	branchConfiguration: { price: "24.50", status: "available" },
};

function renderForm(form: ReactNode) {
	render(
		<QueryClientProvider client={new QueryClient()}>
			<StaffUnsavedChangesProvider>
				{form}
				<Toaster />
			</StaffUnsavedChangesProvider>
		</QueryClientProvider>,
	);
}

afterEach(() => {
	globalThis.fetch = originalFetch;
	window.localStorage?.clear();
});

describe("StaffBranchDishConfigurationForm", () => {
	test("saves price and commercial status with PUT", async () => {
		const user = userEvent.setup();
		let request: { method?: string; body?: string } = {};
		globalThis.fetch = async (_input, init) => {
			request = { method: init?.method, body: String(init?.body) };
			return Response.json({ price: "26.00", status: "sold_out" });
		};

		renderForm(
			<StaffBranchDishConfigurationForm
				branchId={branchId}
				branchStatus="active"
				categoryStatus="active"
				dish={dish}
				session={session}
				userId="staff-user"
			/>,
		);

		const price = screen.getByLabelText("Precio (PEN)");
		await user.clear(price);
		await user.type(price, "26.00");
		await user.selectOptions(
			screen.getByLabelText("Estado comercial"),
			"sold_out",
		);
		await user.click(
			screen.getByRole("button", { name: "Guardar configuración" }),
		);

		await waitFor(() =>
			expect(
				screen.getByText("La configuración del plato fue guardada."),
			).toBeTruthy(),
		);
		expect(request.method).toBe("PUT");
		expect(JSON.parse(request.body ?? "{}")).toEqual({
			price: "26.00",
			status: "sold_out",
		});
	});

	test("requires a valid price for an unconfigured dish", async () => {
		const user = userEvent.setup();
		renderForm(
			<StaffBranchDishConfigurationForm
				branchId={branchId}
				branchStatus="active"
				categoryStatus="active"
				dish={{ ...dish, branchConfiguration: null }}
				session={session}
				userId="staff-user"
			/>,
		);

		const price = screen.getByLabelText("Precio (PEN)");
		await user.type(price, "1");
		await user.click(
			screen.getByRole("button", { name: "Guardar configuración" }),
		);

		expect(
			screen.getByText("Usa un precio con exactamente dos decimales."),
		).toBeTruthy();
		expect(document.activeElement).toBe(price);
	});

	test("keeps the edited price after a network failure", async () => {
		const user = userEvent.setup();
		globalThis.fetch = async () => {
			throw new Error("offline");
		};
		renderForm(
			<StaffBranchDishConfigurationForm
				branchId={branchId}
				branchStatus="inactive"
				categoryStatus="active"
				dish={dish}
				session={session}
				userId="staff-user"
			/>,
		);

		const price = screen.getByLabelText("Precio (PEN)");
		await user.clear(price);
		await user.type(price, "31.25");
		await user.click(
			screen.getByRole("button", { name: "Guardar configuración" }),
		);

		await waitFor(() =>
			expect(
				screen.getByText("No se pudo conectar con el servidor.", {
					exact: false,
				}),
			).toBeTruthy(),
		);
		expect((price as HTMLInputElement).value).toBe("31.25");
		expect(
			screen.getByText("La sucursal está inactiva.", { exact: false }),
		).toBeTruthy();
	});
});
