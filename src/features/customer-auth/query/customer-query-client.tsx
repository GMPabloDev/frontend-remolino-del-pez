import {
	QueryClient,
	type QueryClientConfig,
	QueryClientProvider,
} from "@tanstack/react-query";
import { type PropsWithChildren, useState } from "react";

import { ApiClientError } from "@/lib/api/api-error";

const customerQueryClientConfig: QueryClientConfig = {
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

let sharedCustomerQueryClient: QueryClient | null = null;

export function createCustomerQueryClient(): QueryClient {
	return new QueryClient(customerQueryClientConfig);
}

function getSharedCustomerQueryClient(): QueryClient {
	sharedCustomerQueryClient ??= createCustomerQueryClient();
	return sharedCustomerQueryClient;
}

export function CustomerQueryProvider({ children }: PropsWithChildren) {
	const [queryClient] = useState(getSharedCustomerQueryClient);

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
