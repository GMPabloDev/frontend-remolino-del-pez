import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ProtectedStaffRoute } from "@/features/staff-auth/components/ProtectedStaffRoute";
import {
	StaffAuthProvider,
	useStaffAuth,
} from "@/features/staff-auth/components/StaffAuthProvider";
import { StaffQueryProvider } from "@/features/staff-auth/query/staff-query-client";
import { ApiClientError } from "@/lib/api/api-error";
import { useStaffRestaurantQuery } from "./api/staff-restaurant-client";
import { StaffLayout } from "./components/StaffLayout";

export function StaffDashboardApp() {
	return (
		<StaffQueryProvider>
			<StaffAuthProvider>
				<StaffDashboardScreen />
			</StaffAuthProvider>
		</StaffQueryProvider>
	);
}

function StaffDashboardScreen() {
	const { session, snapshot } = useStaffAuth();
	const restaurantQuery = useStaffRestaurantQuery(session);

	return (
		<ProtectedStaffRoute>
			<StaffLayout title="Inicio">
				{snapshot.user ? (
					<DashboardContent query={restaurantQuery} user={snapshot.user} />
				) : null}
			</StaffLayout>
		</ProtectedStaffRoute>
	);
}

function DashboardContent({
	query,
	user,
}: {
	query: ReturnType<typeof useStaffRestaurantQuery>;
	user: NonNullable<ReturnType<typeof useStaffAuth>["snapshot"]["user"]>;
}) {
	if (query.isPending) {
		return (
			<DashboardStatus message="Cargando el contexto del restaurante…" busy />
		);
	}

	if (query.isError) {
		return (
			<DashboardStatus
				action={
					<Button onClick={() => void query.refetch()}>Reintentar</Button>
				}
				message={getRestaurantErrorMessage(query.error)}
			/>
		);
	}

	const restaurant = query.data;

	return (
		<div className="space-y-6">
			<section className="rounded-3xl border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.08)] sm:p-8">
				<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e76832]">
					Sesión activa
				</p>
				<h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.05em]">
					Hola, {user.fullName}
				</h2>
				<p className="mt-3 max-w-2xl text-sm leading-6 text-[#12324a]/65">
					Tu acceso está listo. Desde aquí podrás gestionar la operación del
					restaurante cuando se incorporen los siguientes módulos.
				</p>
			</section>

			<div className="grid gap-4 md:grid-cols-2">
				<InfoCard label="Restaurante" value={restaurant.name} />
				<InfoCard label="Rol" value={getRoleLabel(user.role)} />
				<InfoCard
					label="Sucursal asignada"
					value={user.branchId ?? "Sin sucursal asignada"}
				/>
				<InfoCard label="Zona horaria" value={restaurant.timezone} />
			</div>
		</div>
	);
}

function InfoCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-2xl border border-[#12324a]/10 bg-white/70 p-5">
			<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#12324a]/45">
				{label}
			</p>
			<p className="mt-2 break-words text-sm font-semibold">{value}</p>
		</div>
	);
}

function DashboardStatus({
	message,
	action,
	busy = false,
}: {
	message: string;
	action?: ReactNode;
	busy?: boolean;
}) {
	return (
		<div
			aria-busy={busy}
			className="rounded-3xl border border-[#12324a]/10 bg-white/80 p-8 text-center shadow-[0_20px_60px_rgba(18,50,74,0.08)]"
			role={busy ? "status" : "alert"}
		>
			<p className="text-sm text-[#12324a]/70">{message}</p>
			{action ? <div className="mt-5">{action}</div> : null}
		</div>
	);
}

function getRestaurantErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError && error.code === "FORBIDDEN") {
		return "No tienes permisos para consultar este restaurante.";
	}

	if (
		error instanceof ApiClientError &&
		error.code === "RESTAURANT_NOT_FOUND"
	) {
		return "El restaurante configurado no está disponible.";
	}

	return "No se pudo cargar el contexto del restaurante.";
}

function getRoleLabel(role: "admin" | "manager" | "branch_admin"): string {
	return {
		admin: "Administrador",
		manager: "Manager",
		branch_admin: "Administrador de sucursal",
	}[role];
}
