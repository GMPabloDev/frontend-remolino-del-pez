import { requestPublicJson } from "../../public-api/api/request-public-json";
import {
	type PublicBranch,
	type PublicRestaurant,
	publicBranchesSchema,
	publicRestaurantSchema,
} from "../contracts/public-discovery.schemas";

export function fetchPublicRestaurant(
	baseUrl: string,
	restaurantSlug: string,
): Promise<PublicRestaurant> {
	return requestPublicJson(
		baseUrl,
		`public/restaurants/${encodeURIComponent(restaurantSlug)}`,
		publicRestaurantSchema,
		"No se pudo conectar con la información del restaurante.",
	);
}

export function fetchPublicBranches(
	baseUrl: string,
	restaurantSlug: string,
): Promise<PublicBranch[]> {
	return requestPublicJson(
		baseUrl,
		`public/restaurants/${encodeURIComponent(restaurantSlug)}/branches`,
		publicBranchesSchema,
		"No se pudo conectar con las sucursales.",
	);
}
