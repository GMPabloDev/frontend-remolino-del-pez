import type { ReactNode } from "react";

interface CatalogListStatusProps {
	message: string;
	action?: ReactNode;
	busy?: boolean;
}

export function CatalogListStatus({
	message,
	action,
	busy = false,
}: CatalogListStatusProps) {
	return (
		<div
			aria-busy={busy}
			className="grid min-h-56 place-items-center rounded-3xl border border-[#12324a]/10 bg-white/80 p-8 text-center shadow-[0_20px_60px_rgba(18,50,74,0.06)]"
			role={busy ? "status" : "alert"}
		>
			<div className="space-y-4">
				<p className="text-sm text-[#12324a]/70">{message}</p>
				{action}
			</div>
		</div>
	);
}
