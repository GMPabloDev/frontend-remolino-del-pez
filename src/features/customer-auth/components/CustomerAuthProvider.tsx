import { useQueryClient } from "@tanstack/react-query";
import {
	createContext,
	type PropsWithChildren,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";

import {
	type CustomerSessionController,
	type CustomerSessionSnapshot,
	createCustomerSession,
} from "../session/customer-session";

interface CustomerAuthContextValue {
	session: CustomerSessionController;
	snapshot: CustomerSessionSnapshot;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(
	null,
);
let sharedCustomerSession: CustomerSessionController | null = null;

export function CustomerAuthProvider({ children }: PropsWithChildren) {
	const [session] = useState(() => {
		sharedCustomerSession ??= createCustomerSession();
		return sharedCustomerSession;
	});
	const queryClient = useQueryClient();
	const previousStatus = useRef<CustomerSessionSnapshot["status"]>("checking");
	const snapshot = useSyncExternalStore(
		session.subscribe,
		session.getSnapshot,
		session.getSnapshot,
	);

	useEffect(() => {
		if (session.getSnapshot().status === "checking") {
			void session.bootstrap();
		}
	}, [session]);

	useEffect(() => {
		if (
			previousStatus.current === "authenticated" &&
			snapshot.status !== "authenticated"
		) {
			queryClient.clear();
		}

		previousStatus.current = snapshot.status;
	}, [queryClient, snapshot.status]);

	const value = useMemo(() => ({ session, snapshot }), [session, snapshot]);

	return (
		<CustomerAuthContext.Provider value={value}>
			{children}
		</CustomerAuthContext.Provider>
	);
}

export function useCustomerAuth(): CustomerAuthContextValue {
	const context = useContext(CustomerAuthContext);

	if (!context) {
		throw new Error(
			"useCustomerAuth debe usarse dentro de CustomerAuthProvider.",
		);
	}

	return context;
}
