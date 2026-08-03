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
	createStaffSession,
	type StaffSessionController,
	type StaffSessionSnapshot,
} from "../session/staff-session";

interface StaffAuthContextValue {
	session: StaffSessionController;
	snapshot: StaffSessionSnapshot;
}

const StaffAuthContext = createContext<StaffAuthContextValue | null>(null);
let sharedStaffSession: StaffSessionController | null = null;

export function StaffAuthProvider({ children }: PropsWithChildren) {
	const [session] = useState(() => {
		sharedStaffSession ??= createStaffSession();
		return sharedStaffSession;
	});
	const queryClient = useQueryClient();
	const previousStatus = useRef<StaffSessionSnapshot["status"]>("checking");
	const snapshot = useSyncExternalStore(
		session.subscribe,
		session.getSnapshot,
		session.getSnapshot,
	);

	useEffect(() => {
		if (session.getSnapshot().status !== "authenticated") {
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
		<StaffAuthContext.Provider value={value}>
			{children}
		</StaffAuthContext.Provider>
	);
}

export function useStaffAuth(): StaffAuthContextValue {
	const context = useContext(StaffAuthContext);

	if (!context) {
		throw new Error("useStaffAuth debe usarse dentro de StaffAuthProvider.");
	}

	return context;
}
