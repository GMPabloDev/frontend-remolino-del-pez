import { z } from "zod";

export const MENU_FIXTURE_SCENARIOS = ["populated", "empty", "error"] as const;
export const DISCOVERY_FIXTURE_SCENARIOS = [
	"empty",
	"single",
	"multiple",
	"error",
] as const;

const DEFAULT_API_BASE_URL = "http://localhost:3000";
const DEFAULT_RESTAURANT_SLUG = "restaurante-olimpico";

const publicEnvironmentSchema = z
	.object({
		PUBLIC_API_BASE_URL: z.url().default(DEFAULT_API_BASE_URL),
		PUBLIC_RESTAURANT_SLUG: z
			.string()
			.trim()
			.min(1)
			.default(DEFAULT_RESTAURANT_SLUG),
		PUBLIC_USE_MENU_FIXTURE: z.enum(["true", "false"]).default("false"),
		PUBLIC_MENU_FIXTURE_SCENARIO: z
			.enum(MENU_FIXTURE_SCENARIOS)
			.default("populated"),
		PUBLIC_DISCOVERY_FIXTURE_SCENARIO: z
			.enum(DISCOVERY_FIXTURE_SCENARIOS)
			.default("multiple"),
	})
	.transform((environment) => ({
		apiBaseUrl: environment.PUBLIC_API_BASE_URL.replace(/\/+$/, ""),
		restaurantSlug: environment.PUBLIC_RESTAURANT_SLUG,
		useMenuFixture: environment.PUBLIC_USE_MENU_FIXTURE === "true",
		menuFixtureScenario: environment.PUBLIC_MENU_FIXTURE_SCENARIO,
		discoveryFixtureScenario: environment.PUBLIC_DISCOVERY_FIXTURE_SCENARIO,
	}));

export type MenuFixtureScenario = (typeof MENU_FIXTURE_SCENARIOS)[number];
export type DiscoveryFixtureScenario =
	(typeof DISCOVERY_FIXTURE_SCENARIOS)[number];
export type PublicRuntimeConfig = z.infer<typeof publicEnvironmentSchema>;

export const runtimeConfig: PublicRuntimeConfig = publicEnvironmentSchema.parse(
	import.meta.env,
);
