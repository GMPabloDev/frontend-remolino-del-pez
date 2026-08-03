import type { CatalogStatus } from "../contracts/staff-catalog.schemas";

export function CatalogStatusBadge({ status }: { status: CatalogStatus }) {
	const isActive = status === "active";

	return (
		<span
			className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${isActive ? "bg-[#dcecef] text-[#236d7d]" : "bg-[#12324a]/8 text-[#12324a]/65"}`}
		>
			{isActive ? "Activa" : "Inactiva"}
		</span>
	);
}
