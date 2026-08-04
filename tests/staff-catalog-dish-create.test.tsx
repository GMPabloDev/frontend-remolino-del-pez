/// <reference lib="dom" />

import { describe, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { StaffSessionAccess } from "../src/features/staff-auth/session/staff-session";
import { StaffDishCreateForm } from "../src/features/staff-catalog/components/StaffDishCreateForm";
import type { MenuCategory } from "../src/features/staff-catalog/contracts/staff-catalog.schemas";
import { StaffUnsavedChangesProvider } from "../src/features/staff-shell/components/StaffUnsavedChangesProvider";

const categories: MenuCategory[] = [
	{
		id: "00000000-0000-4000-8000-000000000001",
		restaurantId: "00000000-0000-4000-8000-000000000010",
		name: "Entradas",
		position: 1,
		status: "active",
		createdAt: "2026-08-01T00:00:00.000Z",
		updatedAt: "2026-08-01T00:00:00.000Z",
	},
	{
		id: "00000000-0000-4000-8000-000000000002",
		restaurantId: "00000000-0000-4000-8000-000000000010",
		name: "Fondos",
		position: 2,
		status: "inactive",
		createdAt: "2026-08-01T00:00:00.000Z",
		updatedAt: "2026-08-01T00:00:00.000Z",
	},
];

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

describe("StaffDishCreateForm", () => {
	test("recalculates position for a new category until the user edits it", async () => {
		const user = userEvent.setup();
		renderForm(
			<StaffDishCreateForm
				categories={categories}
				initialPosition={2}
				positionsByCategory={{ [categories[0].id]: 2, [categories[1].id]: 4 }}
				session={session}
				userId="staff-user"
			/>,
		);

		const position = screen.getByLabelText("Posición") as HTMLInputElement;
		await user.selectOptions(
			screen.getByLabelText("Categoría"),
			categories[1].id,
		);
		expect(position.value).toBe("4");

		await user.clear(position);
		await user.type(position, "9");
		await user.selectOptions(
			screen.getByLabelText("Categoría"),
			categories[0].id,
		);
		expect(position.value).toBe("9");
	});
});
