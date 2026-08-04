/// <reference lib="dom" />

import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { StaffBranchMenuList } from "../src/features/staff-catalog/components/StaffBranchMenuList";
import type { StaffBranchDish } from "../src/features/staff-catalog/contracts/staff-catalog.schemas";
import type { BranchDishFilter } from "../src/features/staff-catalog/lib/branch-dish-filter";

const dishes: StaffBranchDish[] = [
	{
		id: "00000000-0000-4000-8000-000000000003",
		restaurantId: "00000000-0000-4000-8000-000000000001",
		categoryId: "00000000-0000-4000-8000-000000000004",
		categoryName: "Fondos",
		name: "Arroz con pato",
		description: "Arroz con pato al estilo norteño.",
		imageUrl: null,
		ingredients: ["Arroz"],
		allergens: [],
		position: 1,
		status: "active",
		createdAt: "2026-08-01T00:00:00.000Z",
		updatedAt: "2026-08-02T00:00:00.000Z",
		branchConfiguration: { price: "24.50", status: "available" },
	},
	{
		id: "00000000-0000-4000-8000-000000000005",
		restaurantId: "00000000-0000-4000-8000-000000000001",
		categoryId: "00000000-0000-4000-8000-000000000004",
		categoryName: "Fondos",
		name: "Lomo saltado",
		description: "Lomo saltado tradicional.",
		imageUrl: null,
		ingredients: ["Lomo"],
		allergens: [],
		position: 2,
		status: "active",
		createdAt: "2026-08-01T00:00:00.000Z",
		updatedAt: "2026-08-02T00:00:00.000Z",
		branchConfiguration: null,
	},
];

const defaultProps = {
	branchId: "00000000-0000-4000-8000-000000000002",
	canConfigure: true,
	dishes,
	filter: "all" as const,
	isLoading: false,
	isError: false,
	error: null,
	onFilterChange: () => undefined,
	onRetry: () => undefined,
};

describe("StaffBranchMenuList", () => {
	test("groups dishes and shows their commercial configuration", () => {
		render(<StaffBranchMenuList {...defaultProps} />);

		expect(screen.getByRole("table")).toBeTruthy();
		expect(screen.getAllByText("Fondos").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Sin configurar").length).toBeGreaterThan(0);
		expect(screen.getAllByRole("button", { name: "Configurar" }).length).toBe(
			4,
		);
	});

	test("applies local filters without navigation", async () => {
		const user = userEvent.setup();
		function FilterHarness() {
			const [filter, setFilter] = useState<BranchDishFilter>("all");
			return (
				<StaffBranchMenuList
					{...defaultProps}
					filter={filter}
					onFilterChange={setFilter}
				/>
			);
		}

		render(<FilterHarness />);

		await user.click(screen.getByRole("button", { name: "Sin configurar" }));

		expect(screen.getAllByText("Lomo saltado").length).toBeGreaterThan(0);
		expect(screen.queryAllByText("Arroz con pato")).toHaveLength(0);
	});
});
