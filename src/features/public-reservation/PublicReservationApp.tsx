import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { runtimeConfig } from "../../config/runtime";
import {
	usePublicBranchesQuery,
	usePublicMenuQuery,
} from "../public-api/query/public-queries";
import { PublicQueryProvider } from "../public-api/query/public-query-client";
import {
	PublicCartProvider,
	usePublicCart,
} from "../public-cart/PublicCartProvider";
import type { PublicBranch } from "../public-discovery/contracts/public-discovery.schemas";
import { publicSlugSchema } from "../public-discovery/contracts/public-discovery.schemas";
import { readMenuQuery } from "../public-menu/lib/menu-query";
import {
	PUBLIC_PAYMENT_VERSION,
	publicCheckoutReturnSchema,
} from "../public-payment/contracts/public-payment.schemas";
import {
	isAllowedPublicCheckoutUrl,
	matchesPublicCheckoutReservation,
} from "../public-payment/lib/public-payment-contracts";
import { getPublicPaymentErrorPresentation } from "../public-payment/lib/public-payment-errors";
import { writePublicCheckoutReturn } from "../public-payment/lib/public-payment-storage";
import { useCreatePublicCheckoutMutation } from "../public-payment/query/public-payment-query";
import { PublicReservationFlow } from "./components/PublicReservationFlow";
import {
	PublicReservationSummary,
	type PublicReservationSummaryData,
} from "./components/PublicReservationSummary";
import type {
	StoredPublicReservation,
	TemporaryReservationResponse,
} from "./contracts/public-reservation.schemas";
import {
	getCurrentReservationDate,
	getReservationDateBounds,
} from "./lib/public-reservation-date";
import {
	createStoredPublicReservation,
	readPublicReservation,
	removePublicReservation,
	writePublicReservation,
} from "./lib/public-reservation-storage";

export function PublicReservationApp() {
	const [queryResult, setQueryResult] = useState<ReturnType<
		typeof readMenuQuery
	> | null>(null);

	useEffect(() => {
		setQueryResult(readMenuQuery(window.location.search));
	}, []);

	return (
		<PublicQueryProvider>
			{queryResult ? (
				<PublicReservationRoute queryResult={queryResult} />
			) : (
				<ReservationState title="Cargando la reserva…" />
			)}
		</PublicQueryProvider>
	);
}

type ReservationQueryResult =
	| Exclude<ReturnType<typeof readMenuQuery>, { valid: true }>
	| ReturnType<typeof readMenuQuery>;

interface PublicReservationRouteProps {
	queryResult: ReservationQueryResult;
}

function PublicReservationRoute({ queryResult }: PublicReservationRouteProps) {
	const branchesQuery = usePublicBranchesQuery();

	if (!queryResult.valid) {
		return (
			<ReservationState
				description="Abre esta página desde el carrito de una sucursal para iniciar una reserva."
				title="No encontramos la sucursal"
				actionLabel="Ir al menú"
				actionHref="/menu"
			/>
		);
	}

	const branchSlugResult = publicSlugSchema.safeParse(
		queryResult.value.branchSlug,
	);
	if (!branchSlugResult.success) {
		return (
			<ReservationState
				description="El enlace de reserva no contiene una sucursal válida."
				title="Enlace no válido"
				actionLabel="Ir al menú"
				actionHref="/menu"
			/>
		);
	}

	if (branchesQuery.isPending) {
		return <ReservationState title="Cargando la sucursal…" />;
	}

	if (branchesQuery.isError) {
		return (
			<ReservationState
				description="No pudimos consultar las sucursales públicas."
				title="No pudimos cargar la reserva"
				actionLabel="Intentar de nuevo"
				onAction={() => void branchesQuery.refetch()}
			/>
		);
	}

	const branch = branchesQuery.data?.find(
		(currentBranch) => currentBranch.branchSlug === branchSlugResult.data,
	);
	if (!branch) {
		return (
			<ReservationState
				description="La sucursal no está disponible para recibir reservas."
				title="Sucursal no disponible"
				actionLabel="Elegir otra sucursal"
				actionHref="/"
			/>
		);
	}

	return (
		<PublicCartProvider
			branchSlug={branch.branchSlug}
			restaurantSlug={runtimeConfig.restaurantSlug}
		>
			<PublicReservationContent branch={branch} />
		</PublicCartProvider>
	);
}

interface PublicReservationContentProps {
	branch: PublicBranch;
}

function PublicReservationContent({ branch }: PublicReservationContentProps) {
	const {
		isRestoring,
		items,
		persistence,
		reconcileMenu,
		restoreReservationCartHandoff,
		markItemsUnverified,
	} = usePublicCart();
	const menuQuery = usePublicMenuQuery(branch.branchSlug);
	const [reservation, setReservation] = useState<
		TemporaryReservationResponse | StoredPublicReservation | null
	>(null);
	const [reservationChecked, setReservationChecked] = useState(false);
	const [reservationPersisted, setReservationPersisted] = useState(false);
	const [storageWarning, setStorageWarning] = useState(false);
	const [expiredNotice, setExpiredNotice] = useState(false);
	const [checkoutError, setCheckoutError] = useState<string | null>(null);
	const checkoutMutation = useCreatePublicCheckoutMutation();
	const handoffCheckedReference = useRef(false);
	const bounds = useMemo(
		() => getReservationDateBounds(branch.rules.maximumAdvanceDays),
		[branch.rules.maximumAdvanceDays],
	);

	useEffect(() => {
		if (isRestoring || handoffCheckedReference.current) return;
		handoffCheckedReference.current = true;
		if (persistence === "memory" && items.length === 0) {
			restoreReservationCartHandoff();
		}
	}, [isRestoring, items.length, persistence, restoreReservationCartHandoff]);

	useEffect(() => {
		const result = readPublicReservation(
			runtimeConfig.restaurantSlug,
			branch.branchSlug,
		);
		setReservation(result.value);
		setReservationPersisted(
			result.persistence === "persistent" && result.value !== null,
		);
		setReservationChecked(true);
		setStorageWarning(result.persistence === "memory");
		setExpiredNotice(result.reason === "expired");
		setCheckoutError(null);
	}, [branch.branchSlug]);

	useEffect(() => {
		if (menuQuery.data) {
			reconcileMenu(menuQuery.data);
			return;
		}
		if (menuQuery.isError) {
			markItemsUnverified();
		}
	}, [markItemsUnverified, menuQuery.data, menuQuery.isError, reconcileMenu]);

	function handleReservationCreated(
		nextReservation: TemporaryReservationResponse,
	) {
		const storedReservation = createStoredPublicReservation(
			runtimeConfig.restaurantSlug,
			branch.branchSlug,
			nextReservation,
		);
		const writeResult = writePublicReservation(storedReservation);
		setReservation(writeResult.value ?? nextReservation);
		setReservationPersisted(
			writeResult.persistence === "persistent" && writeResult.value !== null,
		);
		setStorageWarning(writeResult.persistence === "memory");
		setExpiredNotice(false);
		setCheckoutError(null);
	}

	function handleReservationExpired() {
		checkoutMutation.reset();
		removePublicReservation(runtimeConfig.restaurantSlug, branch.branchSlug);
		setReservation(null);
		setReservationPersisted(false);
		setCheckoutError(null);
		setExpiredNotice(true);
	}

	function handleCheckout() {
		if (
			checkoutMutation.isPending ||
			!reservationPersisted ||
			!reservation ||
			!isStoredPublicReservation(reservation)
		) {
			setCheckoutError(
				"No pudimos conservar el contexto de la reserva para iniciar el pago.",
			);
			return;
		}

		if (Date.parse(reservation.expiresAt) <= Date.now()) {
			handleReservationExpired();
			return;
		}

		setCheckoutError(null);
		checkoutMutation.mutate(
			{
				restaurantSlug: runtimeConfig.restaurantSlug,
				branchSlug: branch.branchSlug,
				reservationId: reservation.id,
				checkoutToken: reservation.checkoutToken,
			},
			{
				onError: (error) => {
					setCheckoutError(getPublicPaymentErrorPresentation(error).message);
				},
				onSuccess: (checkout) => {
					if (!matchesPublicCheckoutReservation(checkout, reservation)) {
						setCheckoutError(
							"La sesión de pago no coincide con tu reserva. No realizamos la redirección.",
						);
						return;
					}

					if (!isAllowedPublicCheckoutUrl(checkout.checkoutUrl)) {
						setCheckoutError(
							"El proveedor devolvió una dirección de pago no segura. No realizamos la redirección.",
						);
						return;
					}

					const checkoutReturnResult = publicCheckoutReturnSchema.safeParse({
						version: PUBLIC_PAYMENT_VERSION,
						restaurantSlug: runtimeConfig.restaurantSlug,
						branchSlug: branch.branchSlug,
						reservationId: reservation.id,
						paymentAttemptId: checkout.paymentAttemptId,
						initiatedAt: new Date().toISOString(),
						reservationExpiresAt: reservation.expiresAt,
					});

					if (!checkoutReturnResult.success) {
						setCheckoutError(
							"No pudimos preparar el retorno seguro del pago. Conservamos tu reserva.",
						);
						return;
					}

					const writeResult = writePublicCheckoutReturn(
						checkoutReturnResult.data,
					);
					if (writeResult.persistence !== "persistent") {
						setCheckoutError(
							"No pudimos conservar el contexto para volver desde Stripe. Conservamos tu reserva; inténtalo nuevamente.",
						);
						return;
					}

					window.location.assign(checkout.checkoutUrl);
				},
			},
		);
	}

	function refreshMenuAfterDishConflict() {
		void menuQuery.refetch();
	}

	function returnToMenu() {
		window.location.assign(
			`/menu?branch=${encodeURIComponent(branch.branchSlug)}`,
		);
	}

	if (!reservationChecked || isRestoring) {
		return <ReservationState title="Preparando tu selección…" />;
	}

	if (reservation) {
		return (
			<ReservationShell>
				{storageWarning ? <StorageWarning /> : null}
				<PublicReservationSummary
					branchName={branch.name}
					checkoutError={checkoutError ?? undefined}
					isCheckoutPending={checkoutMutation.isPending}
					isPaymentAvailable={
						reservationPersisted &&
						Date.parse(reservation.expiresAt) > Date.now()
					}
					onCheckout={handleCheckout}
					onExpired={handleReservationExpired}
					paymentDisabledReason={
						!reservationPersisted
							? "Guarda la reserva en esta pestaña antes de continuar al pago."
							: undefined
					}
					reservation={toPublicReservationSummary(reservation)}
				/>
			</ReservationShell>
		);
	}

	if (expiredNotice) {
		return (
			<ReservationShell>
				<Alert className="mb-8">
					<AlertTitle>Reserva vencida</AlertTitle>
					<AlertDescription>
						El bloqueo temporal terminó. Tu carrito se conserva para consultar
						nuevamente los horarios.
					</AlertDescription>
				</Alert>
				<PublicReservationFormContent
					branch={branch}
					bounds={bounds}
					items={items}
					onDishUnavailable={refreshMenuAfterDishConflict}
					onReservationCreated={handleReservationCreated}
					onReturnToMenu={returnToMenu}
				/>
			</ReservationShell>
		);
	}

	if (runtimeConfig.useMenuFixture) {
		return (
			<ReservationShell>
				<Alert variant="destructive">
					<AlertTitle>Las reservas reales están deshabilitadas</AlertTitle>
					<AlertDescription>
						Cambia a la API y al menú reales para crear una reserva temporal.
					</AlertDescription>
				</Alert>
			</ReservationShell>
		);
	}

	if (menuQuery.isPending) {
		return <ReservationState title="Verificando tu selección…" />;
	}

	if (menuQuery.isError || !menuQuery.data) {
		return (
			<ReservationState
				description="No pudimos verificar los platos del carrito."
				title="Selección pendiente de verificación"
				actionLabel="Intentar de nuevo"
				onAction={() => void menuQuery.refetch()}
			/>
		);
	}

	if (items.length === 0) {
		return (
			<ReservationState
				description="Añade al menos un plato desde el menú antes de reservar."
				title="Tu carrito está vacío"
				actionLabel="Volver al menú"
				actionHref={`/menu?branch=${encodeURIComponent(branch.branchSlug)}`}
			/>
		);
	}

	const unavailableItems = items.filter(
		(item) => item.availability !== "available",
	);
	if (unavailableItems.length > 0) {
		return (
			<ReservationShell>
				<Alert variant="destructive">
					<AlertTitle>Revisa tu selección</AlertTitle>
					<AlertDescription className="flex flex-col gap-3">
						<span>
							Estos platos deben corregirse antes de iniciar la reserva:
						</span>
						<ul className="list-disc pl-5">
							{unavailableItems.map((item) => (
								<li key={item.dishId}>{item.name}</li>
							))}
						</ul>
						<Button onClick={returnToMenu} variant="outline">
							Volver al menú
						</Button>
					</AlertDescription>
				</Alert>
			</ReservationShell>
		);
	}

	return (
		<ReservationShell>
			<PublicReservationFormContent
				branch={branch}
				bounds={bounds}
				items={items}
				onDishUnavailable={refreshMenuAfterDishConflict}
				onReservationCreated={handleReservationCreated}
				onReturnToMenu={returnToMenu}
			/>
		</ReservationShell>
	);
}

function isStoredPublicReservation(
	reservation: TemporaryReservationResponse | StoredPublicReservation,
): reservation is StoredPublicReservation {
	return "restaurantSlug" in reservation && "version" in reservation;
}

function toPublicReservationSummary(
	reservation: TemporaryReservationResponse | StoredPublicReservation,
): PublicReservationSummaryData {
	return {
		id: reservation.id,
		branchSlug: reservation.branchSlug,
		status: reservation.status,
		date: reservation.date,
		startTime: reservation.startTime,
		endTime: reservation.endTime,
		timezone: reservation.timezone,
		durationMinutes: reservation.durationMinutes,
		expiresAt: reservation.expiresAt,
		partySize: reservation.partySize,
		items: reservation.items,
		currency: reservation.currency,
		total: reservation.total,
		createdAt: reservation.createdAt,
	};
}

interface PublicReservationFormContentProps {
	branch: PublicBranch;
	bounds: ReturnType<typeof getReservationDateBounds>;
	items: ReturnType<typeof usePublicCart>["items"];
	onDishUnavailable(): void;
	onReservationCreated(reservation: TemporaryReservationResponse): void;
	onReturnToMenu(): void;
}

function PublicReservationFormContent({
	branch,
	bounds,
	items,
	onDishUnavailable,
	onReservationCreated,
	onReturnToMenu,
}: PublicReservationFormContentProps) {
	return (
		<PublicReservationFlow
			branchName={branch.name}
			branchSlug={branch.branchSlug}
			initialDate={getCurrentReservationDate()}
			items={items}
			maxDate={bounds.maxDate}
			maxPartySize={branch.rules.maxPartySize}
			minDate={bounds.minDate}
			onDishUnavailable={onDishUnavailable}
			onReservationCreated={onReservationCreated}
			onReturnToMenu={onReturnToMenu}
		/>
	);
}

function ReservationShell({ children }: { children: ReactNode }) {
	return (
		<main
			className="mx-auto w-full max-w-4xl px-5 pb-14 pt-8 sm:px-8 sm:pb-20 sm:pt-10"
			id="main-content"
		>
			{children}
		</main>
	);
}

interface ReservationStateProps {
	actionHref?: string;
	actionLabel?: string;
	description?: string;
	onAction?(): void;
	title: string;
}

function ReservationState({
	actionHref,
	actionLabel,
	description,
	onAction,
	title,
}: ReservationStateProps) {
	return (
		<ReservationShell>
			<section
				aria-live="polite"
				className="rounded-[2rem] border border-[#12324a]/12 bg-white/90 p-6 shadow-[0_24px_80px_rgba(18,50,74,0.09)] sm:p-8"
			>
				<h1 className="font-heading text-3xl font-semibold tracking-[-0.04em] text-[#12324a]">
					{title}
				</h1>
				{description ? (
					<p className="mt-2 max-w-2xl text-sm leading-6 text-[#587080] sm:text-base">
						{description}
					</p>
				) : null}
				{actionLabel && actionHref ? (
					<Button
						className="mt-5 min-h-11 rounded-full px-5"
						onClick={() => window.location.assign(actionHref)}
						variant="outline"
					>
						{actionLabel}
					</Button>
				) : null}
				{actionLabel && onAction ? (
					<Button
						className="mt-5 min-h-11 rounded-full px-5"
						onClick={onAction}
						variant="outline"
					>
						{actionLabel}
					</Button>
				) : null}
			</section>
		</ReservationShell>
	);
}

function StorageWarning() {
	return (
		<Alert className="mb-8">
			<AlertTitle>
				Esta reserva solo estará disponible en esta pestaña
			</AlertTitle>
			<AlertDescription>
				No pudimos guardar la reserva en esta sesión. Evita recargar la página.
			</AlertDescription>
		</Alert>
	);
}
