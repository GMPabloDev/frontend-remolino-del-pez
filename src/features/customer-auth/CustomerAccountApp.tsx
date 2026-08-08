import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { runtimeConfig } from "@/config/runtime";
import { ApiClientError } from "@/lib/api/api-error";
import { createCustomerApiClient } from "./api/customer-api-client";
import {
	CustomerAuthProvider,
	useCustomerAuth,
} from "./components/CustomerAuthProvider";
import { customerProfileSchema } from "./contracts/customer-auth.schemas";
import { CustomerQueryProvider } from "./query/customer-query-client";
import { customerQueryKeys } from "./query/customer-query-keys";

export function CustomerAccountApp() {
	return (
		<CustomerQueryProvider>
			<CustomerAuthProvider>
				<CustomerAccountScreen />
			</CustomerAuthProvider>
		</CustomerQueryProvider>
	);
}

function CustomerAccountScreen() {
	const { session, snapshot } = useCustomerAuth();
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const apiClient = useMemo(() => createCustomerApiClient(session), [session]);
	const profileQuery = useQuery({
		queryKey: customerQueryKeys.profile(runtimeConfig.restaurantSlug),
		queryFn: () =>
			apiClient.request("/customer-auth/me", customerProfileSchema),
		enabled: snapshot.status === "authenticated",
		retry: false,
	});

	useEffect(() => {
		if (snapshot.status === "anonymous") {
			window.location.replace("/customer/access");
		}
	}, [snapshot.status]);

	async function handleLogout(): Promise<void> {
		setIsLoggingOut(true);
		await session.logout();
		window.location.replace("/customer/access");
	}

	if (snapshot.status === "checking") {
		return <CustomerAccountStatus message="Comprobando tu sesión…" busy />;
	}

	if (snapshot.status === "unavailable") {
		return (
			<CustomerAccountStatus
				action={
					<Button onClick={() => void session.bootstrap()} type="button">
						Reintentar
					</Button>
				}
				message="No se pudo comprobar la sesión."
			/>
		);
	}

	if (snapshot.status === "anonymous") {
		return <CustomerAccountStatus message="Redirigiendo al acceso…" busy />;
	}

	if (profileQuery.isPending) {
		return <CustomerAccountStatus message="Cargando tu perfil…" busy />;
	}

	if (profileQuery.isError) {
		return (
			<CustomerAccountStatus
				action={
					<Button onClick={() => void profileQuery.refetch()} type="button">
						Reintentar
					</Button>
				}
				message={getProfileErrorMessage(profileQuery.error)}
			/>
		);
	}

	const profile = profileQuery.data;

	if (!profile) {
		return <CustomerAccountStatus message="No pudimos cargar tu perfil." />;
	}

	return (
		<main
			className="mx-auto min-h-[calc(100vh-4rem)] max-w-2xl px-5 py-10 sm:px-8"
			id="main-content"
		>
			<section className="rounded-[2rem] border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_24px_80px_rgba(18,50,74,0.12)] sm:p-9">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e76832]">
							Área de clientes
						</p>
						<h1 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.06em] text-[#12324a]">
							Mi cuenta
						</h1>
					</div>
					<Badge variant="secondary">Sesión activa</Badge>
				</div>

				<Alert className="mt-8">
					<AlertTitle>Tu acceso está protegido</AlertTitle>
					<AlertDescription>
						Desde aquí puedes revisar los datos asociados a tu cuenta. La
						consulta de reservas estará disponible próximamente.
					</AlertDescription>
				</Alert>

				<dl className="mt-8 grid gap-5 sm:grid-cols-2">
					<ProfileField label="Nombre completo" value={profile.fullName} />
					<ProfileField label="Email" value={profile.email} />
					<ProfileField label="Teléfono" value={profile.phone} />
					<ProfileField label="Restaurante" value={profile.restaurantSlug} />
				</dl>

				<Separator className="my-8" />

				<Button
					disabled={isLoggingOut}
					onClick={() => void handleLogout()}
					variant="outline"
				>
					{isLoggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
				</Button>
			</section>
		</main>
	);
}

function ProfileField({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-2xl border border-[#12324a]/10 bg-[#f4f0e8]/60 p-4">
			<dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#12324a]/55">
				{label}
			</dt>
			<dd className="mt-2 break-words font-medium text-[#12324a]">{value}</dd>
		</div>
	);
}

function CustomerAccountStatus({
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
			className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-2xl place-items-center px-5 py-10 sm:px-8"
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

function getProfileErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError && error.status === 0) {
		return "No se pudo conectar con el servidor.";
	}

	return "No pudimos cargar tu perfil.";
}
