/// <reference lib="dom" />

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Toaster } from "../src/components/ui/sonner";
import type { StaffSessionAccess } from "../src/features/staff-auth/session/staff-session";
import { StaffUnsavedChangesProvider } from "../src/features/staff-shell/components/StaffUnsavedChangesProvider";
import { StaffTableCreateForm } from "../src/features/staff-tables/components/StaffTableCreateForm";
import { StaffTableDetailsForm } from "../src/features/staff-tables/components/StaffTableDetailsForm";
import type { StaffTable } from "../src/features/staff-tables/contracts/staff-table.schemas";

const originalFetch = globalThis.fetch;
const branchId = "00000000-0000-4000-8000-000000000002";
const table: StaffTable = {
	id: "00000000-0000-4000-8000-000000000003",
	branchId,
	code: "TERRAZA-02",
	capacity: 4,
	status: "inactive",
	createdAt: "2026-08-01T00:00:00.000Z",
	updatedAt: "2026-08-02T00:00:00.000Z",
};
const session: StaffSessionAccess = {
	getAccessToken: () => "access-token",
	refreshAccessToken: async () => "access-token",
	invalidateSession: () => undefined,
};

beforeEach(() => {
	process.env.PUBLIC_STAFF_RESTAURANT_ID =
		"00000000-0000-4000-8000-000000000001";
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

function renderWithProviders(form: React.ReactNode) {
	render(
		<QueryClientProvider client={new QueryClient()}>
			<StaffUnsavedChangesProvider>
				{form}
				<Toaster />
			</StaffUnsavedChangesProvider>
		</QueryClientProvider>,
	);
}

describe("staff table forms", () => {
	test("requires capacity and focuses it without submitting", async () => {
		const user = userEvent.setup();
		let requests = 0;
		globalThis.fetch = async () => {
			requests += 1;
			return Response.json(table);
		};

		renderWithProviders(
			<StaffTableCreateForm
				branchId={branchId}
				userId="staff-user"
				session={session}
			/>,
		);

		await user.type(screen.getByLabelText("Código"), "MESA-01");
		await user.click(screen.getByRole("button", { name: "Crear mesa" }));

		expect(requests).toBe(0);
		expect(document.activeElement).toBe(screen.getByLabelText("Capacidad"));
		expect(screen.getByText("Ingresa la capacidad de la mesa.")).toBeTruthy();
	});

	test("maps duplicate create codes to the code field", async () => {
		const user = userEvent.setup();
		globalThis.fetch = async () =>
			Response.json(
				{ error: { code: "TABLE_CODE_ALREADY_EXISTS", message: "duplicate" } },
				{ status: 409 },
			);

		renderWithProviders(
			<StaffTableCreateForm
				branchId={branchId}
				userId="staff-user"
				session={session}
			/>,
		);

		await user.type(screen.getByLabelText("Código"), "MESA-01");
		await user.type(screen.getByLabelText("Capacidad"), "4");
		await user.click(screen.getByRole("button", { name: "Crear mesa" }));

		await waitFor(() =>
			expect(
				screen.getByText("Este código ya está registrado en esta sucursal."),
			).toBeTruthy(),
		);
		expect(document.activeElement).toBe(screen.getByLabelText("Código"));
	});

	test("edits code and capacity in one request", async () => {
		const user = userEvent.setup();
		let request: { method?: string; body?: string } = {};
		globalThis.fetch = async (_input, init) => {
			request = { method: init?.method, body: String(init?.body) };
			return Response.json({ ...table, code: "SALON-03", capacity: 6 });
		};

		renderWithProviders(
			<StaffTableDetailsForm
				branchId={branchId}
				table={table}
				userId="staff-user"
				session={session}
			/>,
		);

		const code = screen.getByLabelText("Código");
		const capacity = screen.getByLabelText("Capacidad");
		await user.clear(code);
		await user.type(code, "SALON-03");
		await user.clear(capacity);
		await user.type(capacity, "6");
		await user.click(screen.getByRole("button", { name: "Guardar datos" }));

		await waitFor(() =>
			expect(
				screen.getByText("Los datos de la mesa fueron guardados."),
			).toBeTruthy(),
		);
		expect(request.method).toBe("PATCH");
		expect(JSON.parse(request.body ?? "{}")).toEqual({
			code: "SALON-03",
			capacity: 6,
		});
	});

	test("keeps edited values after a network failure", async () => {
		const user = userEvent.setup();
		globalThis.fetch = async () => {
			throw new Error("offline");
		};

		renderWithProviders(
			<StaffTableDetailsForm
				branchId={branchId}
				table={table}
				userId="staff-user"
				session={session}
			/>,
		);

		const code = screen.getByLabelText("Código");
		await user.clear(code);
		await user.type(code, "OFFLINE-01");
		await user.click(screen.getByRole("button", { name: "Guardar datos" }));

		await waitFor(() =>
			expect(
				screen.getByText("No se pudo conectar con el servidor.", {
					exact: false,
				}),
			).toBeTruthy(),
		);
		expect((code as HTMLInputElement).value).toBe("OFFLINE-01");
	});
});
