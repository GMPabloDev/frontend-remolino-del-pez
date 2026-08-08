import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiClientError } from "@/lib/api/api-error";
import {
	CustomerAuthProvider,
	useCustomerAuth,
} from "./components/CustomerAuthProvider";
import { consumeCustomerMagicLinkToken } from "./magic-link/customer-magic-link-bootstrap";
import { CustomerQueryProvider } from "./query/customer-query-client";

export function CustomerMagicLinkApp() {
	return (
		<CustomerQueryProvider>
			<CustomerAuthProvider autoBootstrap={false}>
				<CustomerMagicLinkScreen />
			</CustomerAuthProvider>
		</CustomerQueryProvider>
	);
}

function CustomerMagicLinkScreen() {
	const { session } = useCustomerAuth();
	const tokenReference = useRef<string | null | undefined>(undefined);
	const exchangeStarted = useRef(false);
	const [view, setView] = useState<
		"exchanging" | "network-error" | "invalid-link"
	>("exchanging");

	if (tokenReference.current === undefined) {
		tokenReference.current = consumeCustomerMagicLinkToken();
	}

	const token = tokenReference.current;

	const exchangeToken = useCallback(
		async (magicLinkToken: string): Promise<void> => {
			setView("exchanging");

			try {
				await session.exchangeMagicLink(magicLinkToken);
				window.location.replace("/customer/account");
			} catch (error) {
				if (error instanceof ApiClientError && error.status === 0) {
					setView("network-error");
					return;
				}

				setView("invalid-link");
			}
		},
		[session],
	);

	useEffect(() => {
		if (!token) {
			setView("invalid-link");
			return;
		}

		if (exchangeStarted.current) {
			return;
		}

		exchangeStarted.current = true;
		void exchangeToken(token);
	}, [exchangeToken, token]);

	if (view === "exchanging") {
		return (
			<CustomerMagicLinkStatus message="Validando tu enlace de acceso…" busy />
		);
	}

	if (view === "network-error") {
		return (
			<CustomerMagicLinkStatus
				action={
					<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
						<Button
							onClick={() => {
								if (token) {
									void exchangeToken(token);
								}
							}}
							type="button"
						>
							Reintentar
						</Button>
						<a
							className="inline-flex h-8 items-center justify-center rounded-lg px-3 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
							href="/customer/access"
						>
							Solicitar otro enlace
						</a>
					</div>
				}
				message="No pudimos conectar con el servidor. Puedes reintentar este enlace mientras esta pestaña siga abierta."
			/>
		);
	}

	return (
		<main
			className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-md place-items-center px-5 py-10 sm:px-8"
			id="main-content"
		>
			<section className="w-full rounded-[2rem] border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_24px_80px_rgba(18,50,74,0.12)] sm:p-9">
				<Alert aria-live="assertive" variant="destructive">
					<AlertTitle>Este enlace ya no está disponible</AlertTitle>
					<AlertDescription>
						Solicita un nuevo enlace de acceso para continuar.
					</AlertDescription>
				</Alert>
				<a
					className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
					href="/customer/access"
				>
					Solicitar otro enlace
				</a>
			</section>
		</main>
	);
}

function CustomerMagicLinkStatus({
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
