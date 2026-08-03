/// <reference lib="dom" />

import { afterEach, describe, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { StaffSessionAccess } from "../src/features/staff-auth/session/staff-session";
import { StaffBranchStatusControl } from "../src/features/staff-branches/components/StaffBranchStatusControl";
import type { StaffBranch } from "../src/features/staff-branches/contracts/staff-branch.schemas";

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
	status: "active",
	createdAt: "2026-08-01T00:00:00.000Z",
	updatedAt: "2026-08-02T00:00:00.000Z",
	rules: {
		defaultReservationDurationMinutes: 60,
		minimumAdvanceMinutes: 60,
		maximumAdvanceDays: 30,
		arrivalToleranceMinutes: 15,
		maxPartySize: 12,
	},
	intervals: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }],
};

afterEach(() => {
	globalThis.fetch = originalFetch;
});

const session: StaffSessionAccess = {
	getAccessToken: () => "access-token",
	refreshAccessToken: async () => "access-token",
	invalidateSession: () => undefined,
};

function renderControl(value: StaffBranch) {
	render(
		<QueryClientProvider client={new QueryClient()}>
			<StaffBranchStatusControl branch={value} session={session} />
		</QueryClientProvider>,
	);
}

describe("StaffBranchStatusControl", () => {
	test("requires a schedule before activation", () => {
		renderControl({ ...branch, status: "inactive", intervals: [] });

		expect(
			screen
				.getByRole("button", { name: "Activar sucursal" })
				.hasAttribute("disabled"),
		).toBe(true);
		expect(
			screen.getByText("Configura al menos un horario antes de activarla."),
		).toBeTruthy();
	});

	test("shows a permission error without retrying", async () => {
		const user = userEvent.setup();
		let requests = 0;
		globalThis.fetch = async () => {
			requests += 1;
			return Response.json(
				{ error: { code: "FORBIDDEN", message: "denied" } },
				{ status: 403 },
			);
		};
		renderControl(branch);

		await user.click(
			screen.getByRole("button", { name: "Desactivar sucursal" }),
		);
		await user.click(screen.getByRole("button", { name: "Confirmar" }));

		await waitFor(() =>
			expect(
				screen.getByText("No tienes permisos para cambiar el estado", {
					exact: false,
				}).textContent,
			).toContain("No tienes permisos para cambiar el estado"),
		);
		expect(requests).toBe(1);
	});

	test("confirms and submits a status change", async () => {
		const user = userEvent.setup();
		let request: { method?: string; body?: string } = {};
		globalThis.fetch = async (_input, init) => {
			request = { method: init?.method, body: String(init?.body) };
			return Response.json({ ...branch, status: "inactive" });
		};
		renderControl(branch);

		await user.click(
			screen.getByRole("button", { name: "Desactivar sucursal" }),
		);
		expect(screen.getByRole("alertdialog")).toBeTruthy();
		await user.click(screen.getByRole("button", { name: "Confirmar" }));

		await waitFor(() =>
			expect(screen.getByRole("status").textContent).toContain(
				"La sucursal fue desactivada.",
			),
		);
		expect(request.method).toBe("PATCH");
		expect(JSON.parse(request.body ?? "{}")).toEqual({ status: "inactive" });
	});
});
