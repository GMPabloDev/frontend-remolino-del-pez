import { PublicQueryProvider } from '../public-api/query/public-query-client';
import { BranchDiscovery } from './components/BranchDiscovery';

export function PublicDiscoveryApp() {
  return (
    <PublicQueryProvider>
      <BranchDiscovery />
    </PublicQueryProvider>
  );
}
