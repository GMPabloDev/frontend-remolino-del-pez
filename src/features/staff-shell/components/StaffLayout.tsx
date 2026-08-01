import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useStaffAuth } from "@/features/staff-auth/components/StaffAuthProvider";
import type { StaffUser } from "@/features/staff-auth/contracts/staff-auth.schemas";

interface StaffLayoutProps {
	children: ReactNode;
	eyebrow?: string;
	title?: string;
}

export function StaffLayout({
	children,
	eyebrow = "Panel administrativo",
	title = "Inicio",
}: StaffLayoutProps) {
	const { session, snapshot } = useStaffAuth();
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const user = snapshot.user;

	async function handleLogout() {
		setIsLoggingOut(true);
		await session.logout();
		window.location.replace("/staff/login");
	}

	return (
		<div className="min-h-screen bg-[#f4f0e8] text-[#12324a]">
			<header className="border-b border-[#12324a]/10 bg-white/85">
				<div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
					<a
						className="font-heading text-xl font-semibold tracking-[-0.04em] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/25"
						href="/staff"
					>
						El Molino del Pez
					</a>
					<div className="flex items-center gap-3 text-right">
						<div className="hidden sm:block">
							<p className="text-sm font-semibold">{user?.fullName}</p>
							<p className="text-xs text-[#12324a]/55">
								{user ? getRoleLabel(user) : "Sesión staff"}
							</p>
						</div>
						<Button
							disabled={isLoggingOut}
							onClick={() => void handleLogout()}
							variant="outline"
						>
							{isLoggingOut ? "Saliendo…" : "Cerrar sesión"}
						</Button>
					</div>
				</div>
			</header>

			<div className="mx-auto grid max-w-7xl gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:px-12 lg:py-10">
				<nav aria-label="Navegación staff" className="lg:pt-2">
					<ul className="flex gap-2 overflow-x-auto lg:block lg:space-y-2">
						<NavItem href="/staff">Inicio</NavItem>
						<NavItem href="/staff/account">Mi cuenta</NavItem>
					</ul>
				</nav>

				<main className="min-w-0" id="main-content">
					<div className="mb-8 space-y-3">
						<p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e76832]">
							{eyebrow}
						</p>
						<h1 className="font-heading text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
							{title}
						</h1>
					</div>
					{children}
				</main>
			</div>
		</div>
	);
}

function NavItem({ href, children }: { href: string; children: ReactNode }) {
	return (
		<li>
			<a
				className="inline-flex rounded-xl px-4 py-3 text-sm font-semibold text-[#12324a]/70 transition hover:bg-white hover:text-[#12324a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/25"
				href={href}
			>
				{children}
			</a>
		</li>
	);
}

function getRoleLabel(user: StaffUser): string {
	return {
		admin: "Administrador",
		manager: "Manager",
		branch_admin: "Administrador de sucursal",
	}[user.role];
}
