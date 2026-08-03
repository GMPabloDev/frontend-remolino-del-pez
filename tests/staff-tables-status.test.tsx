/// <reference lib="dom" />

import { afterEach, describe, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Toaster } from "../src/components/ui/sonner";
import type { StaffSessionAccess } from "../src/features/staff-auth/session/staff-session";
import type { StaffBranch } from "../src/features/staff-branches/contracts/staff-branch.schemas";
import { StaffTableStatusControl } from "../src/features/staff-tables/components/StaffTableStatusControl";
import type { StaffTable } from "../src/features/staff-tables/contracts/staff-table.schemas";

const originalFetch = globalThis.fetch;
const branch: StaffBranch = {
	id: "00000000-0000-4000-8000-000000000002",
	restaurantId: "00000000-0000-4000-8000-000000000001",
	slug: "miraflores",
	name: "Miraflores",
	code: "MIR",
	address: "Av. Larco 123",
	district: "Miraflores",
	province: "Lima",
	department: "Lima",
	phone: "999111222",
	email: null,
	status: "inactive",
	createdAt: "2026-08-01T00:00:00.000Z",
	updatedAt: "2026-08-02T00:00:00.000Z",
	rules: {
		defaultReservationDurationMinutes: 60,
		minimumAdvanceMinutes: 60,
		maximumAdvanceDays: 30,
		arrivalToleranceMinutes: 15,
		maxPartySize: 12,
	},
	intervals: [],
};
const table: StaffTable = {
	id: "00000000-0000-4000-8000-000000000003",
	branchId: branch.id,
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

afterEach(() => {
	globalThis.fetch = originalFetch;
});

function renderControl(value = table, currentBranch = branch) {
	render(
		<QueryClientProvider client={new QueryClient()}>
			<StaffTableStatusControl
				branch={currentBranch}
				session={session}
				table={value}
			/>
			<Toaster />
		</QueryClientProvider>,
	);
}

describe("StaffTableStatusControl", () => {
	test("allows activation while the branch is inactive", () => {
		renderControl();

		expect(
			screen
				.getByRole("button", { name: "Activar mesa" })
				.hasAttribute("disabled"),
		).toBe(false);
		expect(
			screen.getByText(
				"La sucursal está inactiva. Puedes preparar esta mesa, pero no habrá disponibilidad hasta activar la sucursal.",
			),
		).toBeTruthy();
	});

	test("confirms activation and sends the status request", async () => {
		const user = userEvent.setup();
		let request: { method?: string; body?: string } = {};
		globalThis.fetch = async (_input, init) => {
			request = { method: init?.method, body: String(init?.body) };
			return Response.json({ ...table, status: "active" });
		};
		renderControl();

		await user.click(screen.getByRole("button", { name: "Activar mesa" }));
		expect(screen.getByRole("alertdialog")).toBeTruthy();
		expect(
			screen.getByText(
				"La mesa podrá participar en la disponibilidad cuando la sucursal esté activa.",
			),
		).toBeTruthy();
		await user.click(screen.getByRole("button", { name: "Confirmar" }));

		await waitFor(() =>
			expect(screen.getByText("La mesa fue activada.")).toBeTruthy(),
		);
		expect(request.method).toBe("PATCH");
		expect(JSON.parse(request.body ?? "{}")).toEqual({ status: "active" });
	});

	test("shows the reservation warning before deactivation", async () => {
		const user = userEvent.setup();
		renderControl({ ...table, status: "active" });

		await user.click(screen.getByRole("button", { name: "Desactivar mesa" }));
		expect(
			screen.getByText(
				"La mesa dejará de participar en la disponibilidad futura. Las reservas existentes no se modificarán.",
			),
		).toBeTruthy();
	});
});
