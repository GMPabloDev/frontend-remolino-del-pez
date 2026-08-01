import {
  QueryClient,
  QueryClientProvider,
  type QueryClientConfig,
} from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';

import { PublicApiClientError } from '../contracts/api-error';

const publicQueryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        if (failureCount >= 2 || !(error instanceof PublicApiClientError)) {
          return false;
        }

        return error.status === 0 || error.status >= 500;
      },
    },
  },
};

export function createPublicQueryClient() {
  return new QueryClient(publicQueryClientConfig);
}

export function PublicQueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(createPublicQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
