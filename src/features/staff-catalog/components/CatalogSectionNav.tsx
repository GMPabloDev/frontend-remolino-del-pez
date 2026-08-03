export type CatalogSection = "categories" | "dishes";

interface CatalogSectionNavProps {
	activeSection: CatalogSection;
}

export function CatalogSectionNav({ activeSection }: CatalogSectionNavProps) {
	return (
		<nav aria-label="Secciones del catálogo">
			<ul className="flex flex-wrap gap-2 border-b border-[#12324a]/10 pb-2">
				<li>
					<SectionLink
						active={activeSection === "categories"}
						href="/staff/catalog/categories"
					>
						Categorías
					</SectionLink>
				</li>
				<li>
					<SectionLink
						active={activeSection === "dishes"}
						href="/staff/catalog/dishes"
					>
						Platos
					</SectionLink>
				</li>
			</ul>
		</nav>
	);
}

function SectionLink({
	active,
	children,
	href,
}: {
	active: boolean;
	children: string;
	href: string;
}) {
	return (
		<a
			aria-current={active ? "page" : undefined}
			className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35 ${active ? "bg-[#12324a] text-white" : "text-[#12324a]/60 hover:bg-white hover:text-[#12324a]"}`}
			href={href}
		>
			{children}
		</a>
	);
}
