import { type ReactNode, useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { createCustomerAuthBffClient } from "./api/customer-auth-bff-client";
import { CustomerAccessForm } from "./components/CustomerAccessForm";
import {
	CustomerAuthProvider,
	useCustomerAuth,
} from "./components/CustomerAuthProvider";
import { CustomerQueryProvider } from "./query/customer-query-client";

export function CustomerAccessApp() {
	return (
		<CustomerQueryProvider>
			<CustomerAuthProvider>
				<CustomerAccessScreen />
			</CustomerAuthProvider>
		</CustomerQueryProvider>
	);
}

function CustomerAccessScreen() {
	const { session, snapshot } = useCustomerAuth();
	const authClient = useMemo(createCustomerAuthBffClient, []);

	useEffect(() => {
		if (snapshot.status === "authenticated") {
			window.location.replace("/customer/account");
		}
	}, [snapshot.status]);

	if (snapshot.status === "checking") {
		return <CustomerAccessStatus message="Comprobando tu sesión…" busy />;
	}

	if (snapshot.status === "authenticated") {
		return <CustomerAccessStatus message="Abriendo tu cuenta…" busy />;
	}

	if (snapshot.status === "unavailable") {
		return (
			<CustomerAccessStatus
				action={
					<Button onClick={() => void session.bootstrap()} type="button">
						Reintentar
					</Button>
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
						Área de clientes
					</p>
					<h1 className="font-heading text-4xl font-semibold tracking-[-0.06em] text-[#12324a]">
						Acceso sin contraseña
					</h1>
					<p className="text-sm leading-6 text-[#12324a]/65">
						Te enviaremos un enlace de acceso al correo con el que confirmaste
						tu reserva.
					</p>
				</div>
				<CustomerAccessForm
					onSubmit={(input) =>
						authClient.requestMagicLink(input).then(() => undefined)
					}
				/>
			</section>
		</main>
	);
}

function CustomerAccessStatus({
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
