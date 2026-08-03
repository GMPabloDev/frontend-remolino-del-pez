/// <reference lib="dom" />

import { afterEach, describe, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { StaffSessionAccess } from "../src/features/staff-auth/session/staff-session";
import { StaffBranchDetailsForm } from "../src/features/staff-branches/components/StaffBranchDetailsForm";
import { StaffBranchRulesForm } from "../src/features/staff-branches/components/StaffBranchRulesForm";
import { StaffBranchScheduleForm } from "../src/features/staff-branches/components/StaffBranchScheduleForm";
import { StaffUnsavedChangesProvider } from "../src/features/staff-branches/components/StaffUnsavedChangesProvider";
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

function renderForm(form: ReactNode) {
	render(
		<QueryClientProvider client={new QueryClient()}>
			<StaffUnsavedChangesProvider>{form}</StaffUnsavedChangesProvider>
		</QueryClientProvider>,
	);
}

describe("staff branch detail forms", () => {
	test("saves general details independently", async () => {
		const user = userEvent.setup();
		let request: { method?: string; body?: string } = {};
		globalThis.fetch = async (_input, init) => {
			request = { method: init?.method, body: String(init?.body) };
			return Response.json({ ...branch, name: "Sucursal Centro" });
		};

		renderForm(
			<StaffBranchDetailsForm
				branch={branch}
				session={session}
				userId="staff-user"
			/>,
		);

		const name = screen.getByLabelText("Nombre");
		await user.clear(name);
		await user.type(name, "Sucursal Centro");
		await user.click(screen.getByRole("button", { name: "Guardar datos" }));

		await waitFor(() =>
			expect(screen.getByRole("status").textContent).toContain(
				"Los datos generales fueron guardados.",
			),
		);
		expect(request.method).toBe("PATCH");
		expect(JSON.parse(request.body ?? "{}")).toMatchObject({
			name: "Sucursal Centro",
		});
	});

	test("keeps values after a recoverable network failure", async () => {
		const user = userEvent.setup();
		globalThis.fetch = async () => {
			throw new Error("offline");
		};
		renderForm(
			<StaffBranchDetailsForm
				branch={branch}
				session={session}
				userId="staff-user"
			/>,
		);

		const name = screen.getByLabelText("Nombre");
		await user.clear(name);
		await user.type(name, "Sucursal Offline");
		await user.click(screen.getByRole("button", { name: "Guardar datos" }));

		await waitFor(() =>
			expect(screen.getByRole("alert").textContent).toContain(
				"No se pudo conectar con el servidor.",
			),
		);
		expect((name as HTMLInputElement).value).toBe("Sucursal Offline");
	});

	test("focuses the invalid cross-field rule", async () => {
		const user = userEvent.setup();
		renderForm(
			<StaffBranchRulesForm
				branch={branch}
				session={session}
				userId="staff-user"
			/>,
		);

		const minimumAdvance = screen.getByLabelText("Anticipación mínima");
		await user.clear(minimumAdvance);
		await user.type(minimumAdvance, "43200");
		await user.click(screen.getByRole("button", { name: "Guardar reglas" }));

		expect(document.activeElement).toBe(minimumAdvance);
		expect(
			screen.getByText("Debe ser menor que la anticipación máxima."),
		).toBeTruthy();
	});

	test("shows a remote schedule conflict inside the editor", async () => {
		const user = userEvent.setup();
		globalThis.fetch = async () =>
			Response.json(
				{ error: { code: "BRANCH_SCHEDULE_CONFLICT", message: "conflict" } },
				{ status: 409 },
			);
		renderForm(
			<StaffBranchScheduleForm
				branch={branch}
				session={session}
				userId="staff-user"
			/>,
		);

		await user.click(
			screen.getAllByRole("button", { name: "Añadir intervalo" })[0],
		);
		const startTimes = screen.getAllByLabelText("Desde");
		const endTimes = screen.getAllByLabelText("Hasta");
		await user.type(startTimes[startTimes.length - 1], "18:00");
		await user.type(endTimes[endTimes.length - 1], "20:00");
		await user.click(screen.getByRole("button", { name: "Guardar horario" }));

		await waitFor(() =>
			expect(screen.getByRole("alert").textContent).toContain(
				"Hay intervalos solapados en el mismo día.",
			),
		);
		expect((startTimes[startTimes.length - 1] as HTMLInputElement).value).toBe(
			"18:00",
		);
	});

	test("blocks an empty schedule for an active branch", async () => {
		const user = userEvent.setup();
		renderForm(
			<StaffBranchScheduleForm
				branch={branch}
				session={session}
				userId="staff-user"
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: "Eliminar intervalo de Lunes" }),
		);
		await user.click(screen.getByRole("button", { name: "Guardar horario" }));

		expect(
			screen.getByText(
				"Una sucursal activa debe conservar al menos un intervalo. Desactívala antes de dejarla sin horario.",
			),
		).toBeTruthy();
	});
});
