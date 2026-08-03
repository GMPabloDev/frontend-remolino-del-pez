import {
	QueryClient,
	type QueryClientConfig,
	QueryClientProvider,
} from "@tanstack/react-query";
import { type PropsWithChildren, useState } from "react";

import { ApiClientError } from "@/lib/api/api-error";

const staffQueryClientConfig: QueryClientConfig = {
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			refetchOnWindowFocus: true,
			retry: (failureCount, error) => {
				if (error instanceof ApiClientError) {
					if (error.status === 401 || error.status === 403) {
						return false;
					}

					return (
						failureCount < 2 && (error.status === 0 || error.status >= 500)
					);
				}

				return false;
			},
		},
	},
};

let sharedStaffQueryClient: QueryClient | null = null;

export function createStaffQueryClient(): QueryClient {
	return new QueryClient(staffQueryClientConfig);
}

function getSharedStaffQueryClient(): QueryClient {
	sharedStaffQueryClient ??= createStaffQueryClient();
	return sharedStaffQueryClient;
}

export function StaffQueryProvider({ children }: PropsWithChildren) {
	const [queryClient] = useState(getSharedStaffQueryClient);

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
