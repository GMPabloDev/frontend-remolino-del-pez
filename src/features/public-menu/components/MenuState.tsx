import {
	CircleAlert,
	ImageOff,
	Link2Off,
	LoaderCircle,
	RefreshCw,
	UtensilsCrossed,
} from "lucide-react";

type MenuStateKind = "loading" | "invalid-query" | "empty" | "error";
type InvalidQueryReason = "missing" | "invalid";

interface MenuStateProps {
	kind: MenuStateKind;
	invalidQueryReason?: InvalidQueryReason;
	errorCode?: string;
	onRetry?: () => void;
}

const stateCopy = {
	"invalid-query": {
		title: "Este menú necesita una sucursal válida.",
		description:
			"Revisa el enlace compartido o vuelve al selector para elegir una sucursal activa.",
	},
	empty: {
		title: "Todavía no hay platos publicados aquí.",
		description: "Vuelve pronto para descubrir las novedades de esta sucursal.",
	},
	error: {
		title: "El menú no está disponible por ahora.",
		description:
			"Inténtalo nuevamente en unos segundos. Si el problema continúa, solicita un nuevo enlace.",
	},
} as const;

export function MenuState({
	kind,
	invalidQueryReason,
	errorCode,
	onRetry,
}: MenuStateProps) {
	if (kind === "loading") {
		return (
			<section
				id="main-content"
				className="mx-auto flex min-h-[22rem] max-w-2xl flex-col items-center justify-center px-5 py-16 text-center sm:px-8 sm:py-20"
				role="status"
				aria-live="polite"
			>
				<span className="mb-6 grid size-16 place-items-center rounded-full bg-[#dcecef] text-[#12324a] shadow-[0_16px_35px_rgba(18,50,74,0.08)]">
					<LoaderCircle
						className="animate-spin text-[#e76832]"
						size={27}
						aria-hidden="true"
					/>
				</span>
				<h2 className="font-heading text-3xl font-semibold tracking-[-0.05em] text-[#12324a] sm:text-4xl">
					Preparando la carta.
				</h2>
				<p className="mt-4 max-w-sm text-sm leading-6 text-[#587080] sm:text-base">
					Estamos reuniendo los platos disponibles para esta sucursal.
				</p>
			</section>
		);
	}

	const copy = stateCopy[kind];
	const isInvalidQuery = kind === "invalid-query";
	const Icon = isInvalidQuery
		? Link2Off
		: kind === "empty"
			? UtensilsCrossed
			: CircleAlert;
	const detail =
		isInvalidQuery && invalidQueryReason === "missing"
			? "Falta elegir una sucursal para abrir este menú."
			: copy.description;

	return (
		<section
			id="main-content"
			className="mx-auto flex min-h-[22rem] max-w-2xl flex-col items-center justify-center px-5 py-16 text-center sm:px-8 sm:py-20"
			role={kind === "error" || isInvalidQuery ? "alert" : "status"}
			aria-live="polite"
		>
			<span
				className="mb-6 grid size-16 place-items-center rounded-full bg-[#dcecef] text-[#12324a] shadow-[0_16px_35px_rgba(18,50,74,0.08)]"
				aria-hidden="true"
			>
				<Icon size={26} strokeWidth={1.8} />
			</span>
			<h2 className="max-w-xl font-heading text-3xl font-semibold leading-tight tracking-[-0.05em] text-[#12324a] sm:text-4xl">
				{copy.title}
			</h2>
			<p className="mt-4 max-w-sm text-sm leading-6 text-[#587080] sm:text-base">
				{detail}
			</p>
			{kind === "error" && errorCode === "PUBLIC_MENU_NOT_FOUND" ? (
				<p className="mt-3 text-xs font-medium text-[#587080]">
					Esta sucursal podría estar temporalmente cerrada.
				</p>
			) : null}
			{kind === "error" && errorCode === "PUBLIC_MENU_NOT_FOUND" ? (
				<a
					className="mt-6 inline-flex min-h-11 items-center rounded-full border border-[#12324a]/15 px-5 text-sm font-semibold text-[#12324a] transition-colors hover:border-[#12324a]/35 hover:bg-[#dcecef] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35"
					href="/"
				>
					Volver a sucursales
				</a>
			) : null}
			{isInvalidQuery ? (
				<a
					className="mt-7 inline-flex min-h-11 items-center rounded-full border border-[#12324a]/15 px-5 text-sm font-semibold text-[#12324a] transition-colors hover:border-[#12324a]/35 hover:bg-[#dcecef] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35"
					href="/"
				>
					Volver a sucursales
				</a>
			) : null}
			{kind === "error" && onRetry ? (
				<button
					className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#12324a] px-5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-[#1d4b68] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35"
					type="button"
					onClick={onRetry}
				>
					<RefreshCw size={16} aria-hidden="true" />
					Intentar de nuevo
				</button>
			) : null}
		</section>
	);
}

export function DishImageFallback() {
	return (
		<span
			className="flex h-full flex-col items-center justify-center gap-2 bg-[#dcecef] text-xs font-semibold uppercase tracking-[0.16em] text-[#12324a]/55"
			aria-hidden="true"
		>
			<ImageOff size={24} strokeWidth={1.5} />
			<span>Sin fotografía</span>
		</span>
	);
}
