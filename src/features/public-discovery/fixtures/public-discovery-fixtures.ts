import type { DiscoveryFixtureScenario } from "../../../config/runtime";
import { PublicApiClientError } from "../../public-api/contracts/api-error";
import type {
	PublicBranch,
	PublicRestaurant,
} from "../contracts/public-discovery.schemas";

const fixtureRestaurant: PublicRestaurant = {
	slug: "restaurante-olimpico",
	name: "Restaurante Olímpico",
	phone: "+51999999999",
	email: "hola@restaurante-olimpico.pe",
	timezone: "America/Lima",
};

const branchRules = {
	defaultReservationDurationMinutes: 60,
	minimumAdvanceMinutes: 60,
	maximumAdvanceDays: 30,
	arrivalToleranceMinutes: 15,
	maxPartySize: 8,
};

const fixtureBranches: PublicBranch[] = [
	{
		restaurantSlug: "restaurante-olimpico",
		branchSlug: "miraflores",
		name: "Sucursal Miraflores",
		address: "Av. Larco 123",
		district: "Miraflores",
		province: "Lima",
		department: "Lima",
		phone: "+51991111222",
		email: "miraflores@restaurante-olimpico.pe",
		rules: branchRules,
		intervals: [{ dayOfWeek: 1, startTime: "12:00", endTime: "22:00" }],
	},
	{
		restaurantSlug: "restaurante-olimpico",
		branchSlug: "san-isidro",
		name: "Sucursal San Isidro",
		address: "Av. Conquistadores 456",
		district: "San Isidro",
		province: "Lima",
		department: "Lima",
		phone: "+51993333444",
		email: "sanisidro@restaurante-olimpico.pe",
		rules: branchRules,
		intervals: [{ dayOfWeek: 2, startTime: "12:00", endTime: "22:00" }],
	},
];

function fixtureError(): never {
	throw new PublicApiClientError(
		503,
		"FIXTURE_ERROR",
		"El descubrimiento de demostración no está disponible.",
	);
}

export function getRestaurantFixture(
	scenario: DiscoveryFixtureScenario,
): PublicRestaurant {
	if (scenario === "error") {
		return fixtureError();
	}

	return fixtureRestaurant;
}

export function getBranchesFixture(
	scenario: DiscoveryFixtureScenario,
): PublicBranch[] {
	if (scenario === "error") {
		return fixtureError();
	}

	if (scenario === "empty") {
		return [];
	}

	if (scenario === "single") {
		return fixtureBranches.slice(0, 1);
	}

	return fixtureBranches;
}
