import {
	type QueryClient,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";

import { getStaffRuntimeConfig } from "@/config/runtime";
import type { StaffSessionAccess } from "@/features/staff-auth/session/staff-session";
import {
	createStaffCatalogClient,
	type StaffCatalogClient,
} from "../api/staff-catalog-client";
import type {
	CatalogStatus,
	CreateDishRequest,
	CreateMenuCategoryRequest,
	MenuCategory,
	ReplaceBranchDishConfigurationRequest,
	UpdateDishRequest,
	UpdateMenuCategoryRequest,
} from "../contracts/staff-catalog.schemas";
import {
	type CatalogOrderItem,
	getChangedCatalogOrder,
} from "../lib/catalog-order";

export const staffCatalogQueryKeys = {
	all: ["staff", "catalog"] as const,
	categories: ["staff", "catalog", "categories"] as const,
	categoryList: (restaurantId: string, status?: CatalogStatus) =>
		[
			"staff",
			"catalog",
			"categories",
			"list",
			restaurantId,
			status ?? "all",
		] as const,
	categoryDetail: (restaurantId: string, categoryId: string) =>
		[
			"staff",
			"catalog",
			"categories",
			"detail",
			restaurantId,
			categoryId,
		] as const,
	dishes: ["staff", "catalog", "dishes"] as const,
	dishList: (restaurantId: string, status?: CatalogStatus) =>
		[
			"staff",
			"catalog",
			"dishes",
			"list",
			restaurantId,
			status ?? "all",
		] as const,
	dishDetail: (restaurantId: string, dishId: string) =>
		["staff", "catalog", "dishes", "detail", restaurantId, dishId] as const,
	branchDishes: ["staff", "catalog", "branch-dishes"] as const,
	branchDishList: (restaurantId: string, branchId: string) =>
		["staff", "catalog", "branch-dishes", restaurantId, branchId] as const,
};

export function useStaffCatalogClient(
	session: StaffSessionAccess,
): StaffCatalogClient {
	return useMemo(() => createStaffCatalogClient(session), [session]);
}

export function useStaffCategoriesQuery(
	session: StaffSessionAccess,
	status?: CatalogStatus,
) {
	const { restaurantId } = getStaffRuntimeConfig();
	const client = useStaffCatalogClient(session);

	return useQuery({
		queryKey: staffCatalogQueryKeys.categoryList(restaurantId, status),
		queryFn: () => client.listCategories(status),
		retry: false,
		enabled: session.getAccessToken() !== null,
	});
}

export function useStaffCategoryQuery(
	session: StaffSessionAccess,
	categoryId: string,
) {
	const { restaurantId } = getStaffRuntimeConfig();
	const client = useStaffCatalogClient(session);

	return useQuery({
		queryKey: staffCatalogQueryKeys.categoryDetail(restaurantId, categoryId),
		queryFn: () => client.getCategory(categoryId),
		retry: false,
		enabled: session.getAccessToken() !== null && categoryId.length > 0,
	});
}

export function useStaffDishesQuery(
	session: StaffSessionAccess,
	status?: CatalogStatus,
) {
	const { restaurantId } = getStaffRuntimeConfig();
	const client = useStaffCatalogClient(session);

	return useQuery({
		queryKey: staffCatalogQueryKeys.dishList(restaurantId, status),
		queryFn: () => client.listDishes(status),
		retry: false,
		enabled: session.getAccessToken() !== null,
	});
}

export function useStaffDishQuery(session: StaffSessionAccess, dishId: string) {
	const { restaurantId } = getStaffRuntimeConfig();
	const client = useStaffCatalogClient(session);

	return useQuery({
		queryKey: staffCatalogQueryKeys.dishDetail(restaurantId, dishId),
		queryFn: () => client.getDish(dishId),
		retry: false,
		enabled: session.getAccessToken() !== null && dishId.length > 0,
	});
}

export function useStaffBranchDishesQuery(
	session: StaffSessionAccess,
	branchId: string,
) {
	const { restaurantId } = getStaffRuntimeConfig();
	const client = useStaffCatalogClient(session);

	return useQuery({
		queryKey: staffCatalogQueryKeys.branchDishList(restaurantId, branchId),
		queryFn: () => client.listBranchDishes(branchId),
		retry: false,
		enabled: session.getAccessToken() !== null && branchId.length > 0,
	});
}

export function useCreateMenuCategoryMutation(session: StaffSessionAccess) {
	const client = useStaffCatalogClient(session);
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateMenuCategoryRequest) =>
			client.createCategory(input),
		onSuccess: (category) => updateCategoryQueries(queryClient, category),
	});
}

export function useUpdateMenuCategoryMutation(session: StaffSessionAccess) {
	const client = useStaffCatalogClient(session);
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			categoryId,
			input,
		}: {
			categoryId: string;
			input: UpdateMenuCategoryRequest;
		}) => client.updateCategory(categoryId, input),
		onSuccess: (category) => updateCategoryQueries(queryClient, category),
	});
}

export function useUpdateMenuCategoryOrderMutation(
	session: StaffSessionAccess,
) {
	const client = useStaffCatalogClient(session);
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			baseOrder,
			categories,
			orderedIds,
		}: {
			baseOrder: CatalogOrderItem[];
			categories: MenuCategory[];
			orderedIds: string[];
		}) => {
			const changes = getChangedCatalogOrder(baseOrder, orderedIds);
			const categoriesById = new Map(
				categories.map((category) => [category.id, category]),
			);
			const updatedCategories: MenuCategory[] = [];

			for (const change of changes) {
				const category = categoriesById.get(change.id);
				if (!category) continue;

				updatedCategories.push(
					await client.updateCategory(category.id, {
						name: category.name,
						position: change.position,
					}),
				);
			}

			return updatedCategories;
		},
		onSuccess: (categories) => {
			const { restaurantId } = getStaffRuntimeConfig();
			for (const category of categories) {
				queryClient.setQueryData(
					staffCatalogQueryKeys.categoryDetail(restaurantId, category.id),
					category,
				);
			}
			void queryClient.invalidateQueries({
				queryKey: staffCatalogQueryKeys.categories,
			});
			void queryClient.invalidateQueries({
				queryKey: staffCatalogQueryKeys.dishes,
			});
			void queryClient.invalidateQueries({
				queryKey: staffCatalogQueryKeys.branchDishes,
			});
		},
		onError: () => {
			void queryClient.invalidateQueries({
				queryKey: staffCatalogQueryKeys.categories,
			});
		},
	});
}

export function useUpdateMenuCategoryStatusMutation(
	session: StaffSessionAccess,
) {
	const client = useStaffCatalogClient(session);
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			categoryId,
			status,
		}: {
			categoryId: string;
			status: CatalogStatus;
		}) => client.updateCategoryStatus(categoryId, status),
		onSuccess: (category) => updateCategoryQueries(queryClient, category),
	});
}

export function useCreateDishMutation(session: StaffSessionAccess) {
	const client = useStaffCatalogClient(session);
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateDishRequest) => client.createDish(input),
		onSuccess: (dish) => updateDishQueries(queryClient, dish),
	});
}

export function useUpdateDishMutation(session: StaffSessionAccess) {
	const client = useStaffCatalogClient(session);
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			dishId,
			input,
		}: {
			dishId: string;
			input: UpdateDishRequest;
		}) => client.updateDish(dishId, input),
		onSuccess: (dish) => updateDishQueries(queryClient, dish),
	});
}

export function useUpdateDishStatusMutation(session: StaffSessionAccess) {
	const client = useStaffCatalogClient(session);
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			dishId,
			status,
		}: {
			dishId: string;
			status: CatalogStatus;
		}) => client.updateDishStatus(dishId, status),
		onSuccess: (dish) => updateDishQueries(queryClient, dish),
	});
}

export function useUpdateBranchDishConfigurationMutation(
	session: StaffSessionAccess,
) {
	const client = useStaffCatalogClient(session);
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			branchId,
			dishId,
			input,
		}: {
			branchId: string;
			dishId: string;
			input: ReplaceBranchDishConfigurationRequest;
		}) => client.updateBranchDishConfiguration(branchId, dishId, input),
		onSuccess: (_configuration, variables) => {
			void queryClient.invalidateQueries({
				queryKey: staffCatalogQueryKeys.branchDishList(
					getStaffRuntimeConfig().restaurantId,
					variables.branchId,
				),
			});
		},
	});
}

function updateCategoryQueries(
	queryClient: QueryClient,
	category: Awaited<ReturnType<StaffCatalogClient["getCategory"]>>,
): void {
	const { restaurantId } = getStaffRuntimeConfig();
	queryClient.setQueryData(
		staffCatalogQueryKeys.categoryDetail(restaurantId, category.id),
		category,
	);
	void queryClient.invalidateQueries({
		queryKey: staffCatalogQueryKeys.categories,
	});
	void queryClient.invalidateQueries({
		queryKey: staffCatalogQueryKeys.dishes,
	});
	void queryClient.invalidateQueries({
		queryKey: staffCatalogQueryKeys.branchDishes,
	});
}

function updateDishQueries(
	queryClient: QueryClient,
	dish: Awaited<ReturnType<StaffCatalogClient["getDish"]>>,
): void {
	const { restaurantId } = getStaffRuntimeConfig();
	queryClient.setQueryData(
		staffCatalogQueryKeys.dishDetail(restaurantId, dish.id),
		dish,
	);
	void queryClient.invalidateQueries({
		queryKey: staffCatalogQueryKeys.dishes,
	});
	void queryClient.invalidateQueries({
		queryKey: staffCatalogQueryKeys.branchDishes,
	});
}
