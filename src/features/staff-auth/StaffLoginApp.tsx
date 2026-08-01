import { type ReactNode, useEffect, useState } from "react";
import { LoginForm } from "./components/LoginForm";
import {
	StaffAuthProvider,
	useStaffAuth,
} from "./components/StaffAuthProvider";
import { sanitizeStaffReturnTo } from "./lib/staff-return-to";
import { StaffQueryProvider } from "./query/staff-query-client";

export function StaffLoginApp() {
	return (
		<StaffQueryProvider>
			<StaffAuthProvider>
				<StaffLoginScreen />
			</StaffAuthProvider>
		</StaffQueryProvider>
	);
}

function StaffLoginScreen() {
	const { session, snapshot } = useStaffAuth();
	const [returnTo, setReturnTo] = useState<string | null>(null);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		setReturnTo(sanitizeStaffReturnTo(params.get("returnTo")));
	}, []);

	useEffect(() => {
		if (snapshot.status === "authenticated" && returnTo) {
			window.location.replace(returnTo);
		}
	}, [returnTo, snapshot.status]);

	if (returnTo === null || snapshot.status === "checking") {
		return <StaffLoginStatus message="Comprobando tu sesión…" busy />;
	}

	if (snapshot.status === "authenticated") {
		return <StaffLoginStatus message="Abriendo el panel…" busy />;
	}

	if (snapshot.status === "unavailable") {
		return (
			<StaffLoginStatus
				action={
					<button
						className="rounded-xl bg-[#12324a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#12324a]/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/30"
						onClick={() => void session.bootstrap()}
						type="button"
					>
						Reintentar
					</button>
				}
				message="No se pudo comprobar la sesión."
			/>
		);
	}

	return (
		<main
			className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-md place-items-center px-5 py-10 sm:px-8"
			id="main-content"
		>
			<section className="w-full rounded-[2rem] border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_24px_80px_rgba(18,50,74,0.12)] sm:p-9">
				<div className="mb-8 space-y-3">
					<p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e76832]">
						Área interna
					</p>
					<h1 className="font-heading text-4xl font-semibold tracking-[-0.06em] text-[#12324a]">
						Ingreso staff
					</h1>
					<p className="text-sm leading-6 text-[#12324a]/65">
						Accede a las herramientas administrativas del restaurante.
					</p>
				</div>
				<LoginForm
					onSuccess={() => {
						if (returnTo) {
							window.location.replace(returnTo);
						}
					}}
				/>
			</section>
		</main>
	);
}

function StaffLoginStatus({
	message,
	action,
	busy = false,
}: {
	message: string;
	action?: ReactNode;
	busy?: boolean;
}) {
	return (
		<main
			className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-md place-items-center px-5 py-10"
			id="main-content"
		>
			<div
				aria-busy={busy}
				className="w-full rounded-[2rem] border border-[#12324a]/10 bg-white/90 p-8 text-center shadow-[0_24px_80px_rgba(18,50,74,0.12)]"
				role="status"
			>
				<p className="text-sm text-[#12324a]/70">{message}</p>
				{action ? <div className="mt-5">{action}</div> : null}
			</div>
		</main>
	);
}
