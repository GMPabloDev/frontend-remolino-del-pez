/// <reference lib="dom" />

import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffBranchList } from "../src/features/staff-branches/components/StaffBranchList";

const branch = {
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
	status: "active" as const,
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

const defaultProps = {
	branches: [branch],
	filter: "all" as const,
	canCreate: true,
	isLoading: false,
	isError: false,
	error: null,
	onRetry: () => undefined,
};

describe("StaffBranchList", () => {
	test("renders semantic branch information and creation action", () => {
		render(<StaffBranchList {...defaultProps} />);

		expect(screen.getByRole("table")).toBeTruthy();
		expect(screen.getAllByText("Código MIR")).toHaveLength(2);
		expect(screen.getAllByText("Miraflores").length).toBeGreaterThan(0);
		expect(screen.getAllByRole("link", { name: "Administrar" })).toHaveLength(
			2,
		);
		expect(
			screen
				.getByRole("button", { name: "Nueva sucursal" })
				.getAttribute("href"),
		).toBe("/staff/branches/new");
	});

	test("marks the selected filter and hides creation for restricted users", () => {
		render(
			<StaffBranchList
				{...defaultProps}
				branches={[]}
				canCreate={false}
				filter="inactive"
			/>,
		);

		expect(
			screen
				.getByRole("link", { name: "Inactivas" })
				.getAttribute("aria-current"),
		).toBe("page");
		expect(
			screen.getByRole("link", { name: "Inactivas" }).getAttribute("href"),
		).toBe("/staff/branches?status=inactive");
		expect(screen.queryByRole("button", { name: "Nueva sucursal" })).toBeNull();
		expect(
			screen.getByText("No hay sucursales asignadas a tu usuario."),
		).toBeTruthy();
	});

	test("shows a recoverable error state", async () => {
		const user = userEvent.setup();
		let retries = 0;
		render(
			<StaffBranchList
				{...defaultProps}
				isError
				error={new Error("network")}
				onRetry={() => {
					retries += 1;
				}}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Reintentar" }));
		expect(retries).toBe(1);
	});
});
