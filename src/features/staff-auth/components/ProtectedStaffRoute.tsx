import type { ReactNode } from "react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { sanitizeStaffReturnTo } from "../lib/staff-return-to";
import { useStaffAuth } from "./StaffAuthProvider";

interface ProtectedStaffRouteProps {
	children: ReactNode;
}

export function ProtectedStaffRoute({
	children,
}: ProtectedStaffRouteProps): ReactNode {
	const { session, snapshot } = useStaffAuth();

	useEffect(() => {
		if (snapshot.status !== "anonymous" || typeof window === "undefined") {
			return;
		}

		const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
		const returnTo = sanitizeStaffReturnTo(currentPath);
		window.location.replace(
			`/staff/login?returnTo=${encodeURIComponent(returnTo)}`,
		);
	}, [snapshot.status]);

	if (snapshot.status === "checking") {
		return <SessionStatus message="Comprobando tu sesión…" busy />;
	}

	if (snapshot.status === "unavailable") {
		return (
			<SessionStatus
				message="No se pudo comprobar la sesión."
				action={
					<Button onClick={() => void session.bootstrap()}>Reintentar</Button>
				}
			/>
		);
	}

	if (snapshot.status === "anonymous") {
		return <SessionStatus message="Redirigiendo al inicio de sesión…" busy />;
	}

	return children;
}

function SessionStatus({
	message,
	action,
	busy = false,
}: {
	message: string;
	action?: ReactNode;
	busy?: boolean;
}) {
	return (
		<div
			className="grid min-h-[18rem] place-items-center rounded-3xl border border-[#12324a]/10 bg-white/80 p-8 text-center shadow-[0_20px_60px_rgba(18,50,74,0.08)]"
			aria-busy={busy}
			role="status"
		>
			<div className="space-y-4">
				<p className="text-sm text-[#12324a]/70">{message}</p>
				{action}
			</div>
		</div>
	);
}
