/// <reference lib="dom" />

import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { StaffBranchesClient } from "../src/features/staff-branches/api/staff-branches-client";
import { StaffBranchCreateForm } from "../src/features/staff-branches/components/StaffBranchCreateForm";
import { StaffUnsavedChangesProvider } from "../src/features/staff-shell/components/StaffUnsavedChangesProvider";
import { ApiClientError } from "../src/lib/api/api-error";

function renderCreateForm(client: StaffBranchesClient) {
	render(
		<StaffUnsavedChangesProvider>
			<StaffBranchCreateForm client={client} userId="staff-user" />
		</StaffUnsavedChangesProvider>,
	);
}

function createClient(
	createBranch: StaffBranchesClient["createBranch"],
): StaffBranchesClient {
	return { createBranch } as StaffBranchesClient;
}

describe("StaffBranchCreateForm", () => {
	test("focuses the first invalid field without calling the API", async () => {
		const user = userEvent.setup();
		let calls = 0;
		renderCreateForm(
			createClient(async () => {
				calls += 1;
				throw new Error("unexpected request");
			}),
		);

		await user.click(screen.getByRole("button", { name: "Crear sucursal" }));

		expect(calls).toBe(0);
		expect(document.activeElement).toBe(screen.getByLabelText("Nombre"));
		expect(screen.getByText("Ingresa el nombre de la sucursal.")).toBeTruthy();
	});

	test("maps a duplicate code API error to the code field", async () => {
		const user = userEvent.setup();
		renderCreateForm(
			createClient(async () => {
				throw new ApiClientError(
					409,
					"BRANCH_CODE_ALREADY_EXISTS",
					"Duplicate code",
				);
			}),
		);

		await user.type(screen.getByLabelText("Nombre"), "Sucursal Centro");
		await user.type(screen.getByLabelText("Código"), "CENTRO");
		await user.type(screen.getByLabelText("Dirección"), "Av. Central 123");
		await user.type(screen.getByLabelText("Distrito"), "Centro");
		await user.type(screen.getByLabelText("Provincia"), "Lima");
		await user.type(screen.getByLabelText("Departamento"), "Lima");
		await user.type(screen.getByLabelText("Teléfono"), "999111222");
		await user.click(screen.getByRole("button", { name: "Crear sucursal" }));

		expect(screen.getByText("Este código ya está registrado.")).toBeTruthy();
		expect(document.activeElement).toBe(screen.getByLabelText("Código"));
	});
});
