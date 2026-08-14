import {
	Building2,
	CircleAlert,
	LoaderCircle,
	RefreshCw,
	Store,
} from "lucide-react";

type DiscoveryStateKind = "loading" | "configuration" | "empty" | "error";

interface DiscoveryStateProps {
	kind: DiscoveryStateKind;
	errorCode?: string;
	onRetry?: () => void;
}

const stateCopy = {
	configuration: {
		title: "No podemos encontrar el restaurante todavía.",
		description:
			"El enlace público necesita una configuración válida para mostrar sus sucursales.",
	},
	empty: {
		title: "Todavía no hay sucursales publicadas.",
		description: "Vuelve pronto para descubrir dónde encontrarnos.",
	},
	error: {
		title: "No pudimos cargar las sucursales.",
		description:
			"Inténtalo nuevamente en unos segundos. Si el problema continúa, vuelve a abrir el enlace.",
	},
} as const;

export function DiscoveryState({
	kind,
	errorCode,
	onRetry,
}: DiscoveryStateProps) {
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
					Buscando tus sucursales.
				</h2>
				<p className="mt-4 max-w-sm text-sm leading-6 text-[#587080] sm:text-base">
					Estamos preparando los lugares donde puedes comenzar tu reserva.
				</p>
			</section>
		);
	}

	const copy = stateCopy[kind];
	const Icon =
		kind === "empty"
			? Store
			: kind === "configuration"
				? Building2
				: CircleAlert;

	return (
		<section
			id="main-content"
			className="mx-auto flex min-h-[22rem] max-w-2xl flex-col items-center justify-center px-5 py-16 text-center sm:px-8 sm:py-20"
			role={kind === "error" || kind === "configuration" ? "alert" : "status"}
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
				{copy.description}
			</p>
			{kind === "error" && errorCode === "RESTAURANT_NOT_FOUND" ? (
				<p className="mt-3 text-xs font-medium text-[#587080]">
					El restaurante configurado no está disponible.
				</p>
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
