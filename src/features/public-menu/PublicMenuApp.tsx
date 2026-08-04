import { PublicQueryProvider } from "../public-api/query/public-query-client";
import { PublicMenu } from "./components/PublicMenu";

export function PublicMenuApp() {
	return (
		<PublicQueryProvider>
			<div className="relative">
				<PublicMenu />
			</div>
		</PublicQueryProvider>
	);
}
