import {
	createContext,
	type PropsWithChildren,
	useContext,
	useEffect,
	useMemo,
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

export function StaffAuthProvider({ children }: PropsWithChildren) {
	const [session] = useState(createStaffSession);
	const snapshot = useSyncExternalStore(
		session.subscribe,
		session.getSnapshot,
		session.getSnapshot,
	);

	useEffect(() => {
		void session.bootstrap();
		return () => session.destroy();
	}, [session]);

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
