/// <reference lib="dom" />

import { afterEach, describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffTableList } from "../src/features/staff-tables/components/StaffTableList";

const branchId = "00000000-0000-4000-8000-000000000002";
const tables = [
	{
		id: "00000000-0000-4000-8000-000000000003",
		branchId,
		code: "TERRAZA-02",
		capacity: 4,
		status: "active" as const,
		createdAt: "2026-08-01T00:00:00.000Z",
		updatedAt: "2026-08-02T00:00:00.000Z",
	},
];

const defaultProps = {
	branchId,
	branchName: "Miraflores",
	tables,
	filter: "all" as const,
	canCreate: true,
	isLoading: false,
	isError: false,
	error: null,
	onRetry: () => undefined,
};

afterEach(() => {
	window.history.pushState({}, "", `/staff/branches/${branchId}/tables`);
});

describe("StaffTableList", () => {
	test("renders semantic desktop data and mobile administration links", () => {
		render(<StaffTableList {...defaultProps} />);

		expect(screen.getByRole("table")).toBeTruthy();
		expect(screen.getAllByText("TERRAZA-02")).toHaveLength(2);
		expect(screen.getAllByText("4 personas")).toHaveLength(2);
		expect(screen.getAllByRole("link", { name: "Administrar" })).toHaveLength(
			2,
		);
		expect(
			screen.getByRole("button", { name: "Nueva mesa" }).getAttribute("href"),
		).toBe(`/staff/branches/${branchId}/tables/new`);
	});

	test("changes filters without full navigation", async () => {
		const user = userEvent.setup();
		render(<StaffTableList {...defaultProps} />);

		await user.click(screen.getByRole("link", { name: "Activas" }));

		expect(window.location.pathname).toBe(`/staff/branches/${branchId}/tables`);
		expect(window.location.search).toBe("?status=active");
	});

	test("hides creation for restricted users and shows empty state", () => {
		render(
			<StaffTableList
				{...defaultProps}
				tables={[]}
				canCreate={false}
				filter="inactive"
			/>,
		);

		expect(screen.queryByRole("button", { name: "Nueva mesa" })).toBeNull();
		expect(
			screen.getByText("No hay mesas asignadas a tu usuario."),
		).toBeTruthy();
		expect(
			screen.getByRole("link", { name: "Inactivas" }).getAttribute("href"),
		).toBe(`/staff/branches/${branchId}/tables?status=inactive`);
	});

	test("shows recoverable errors", async () => {
		const user = userEvent.setup();
		let retries = 0;
		render(
			<StaffTableList
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
