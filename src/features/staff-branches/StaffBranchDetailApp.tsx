import { Mail, MapPin, Phone } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ProtectedStaffRoute } from "@/features/staff-auth/components/ProtectedStaffRoute";
import {
	StaffAuthProvider,
	useStaffAuth,
} from "@/features/staff-auth/components/StaffAuthProvider";
import { StaffQueryProvider } from "@/features/staff-auth/query/staff-query-client";
import type { StaffSessionAccess } from "@/features/staff-auth/session/staff-session";
import { StaffLayout } from "@/features/staff-shell/components/StaffLayout";
import { ApiClientError } from "@/lib/api/api-error";
import { StaffBranchDetailsForm } from "./components/StaffBranchDetailsForm";
import { StaffBranchRulesForm } from "./components/StaffBranchRulesForm";
import type { StaffBranch } from "./contracts/staff-branch.schemas";
import { useStaffBranchQuery } from "./query/staff-branches-query";

interface StaffBranchDetailAppProps {
	branchId: string;
}

export function StaffBranchDetailApp({ branchId }: StaffBranchDetailAppProps) {
	return (
		<StaffQueryProvider>
			<StaffAuthProvider>
				<StaffBranchDetailScreen branchId={branchId} />
			</StaffAuthProvider>
		</StaffQueryProvider>
	);
}

function StaffBranchDetailScreen({ branchId }: StaffBranchDetailAppProps) {
	const { session, snapshot } = useStaffAuth();
	const branchQuery = useStaffBranchQuery(session, branchId);

	return (
		<ProtectedStaffRoute>
			<StaffLayout eyebrow="Gestión de sucursales" title="Administrar sucursal">
				{branchQuery.isPending ? (
					<DetailStatus busy message="Cargando la sucursal…" />
				) : null}
				{branchQuery.isError ? (
					<DetailErrorState
						error={branchQuery.error}
						onRetry={() => void branchQuery.refetch()}
					/>
				) : null}
				{branchQuery.data && snapshot.user ? (
					<BranchOverview
						branch={branchQuery.data}
						session={session}
						userId={snapshot.user.id}
					/>
				) : null}
			</StaffLayout>
		</ProtectedStaffRoute>
	);
}

function BranchOverview({
	branch,
	session,
	userId,
}: {
	branch: StaffBranch;
	session: StaffSessionAccess;
	userId: string;
}) {
	return (
		<div className="space-y-6">
			<section className="rounded-3xl border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.08)] sm:p-8">
				<div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e76832]">
							Sucursal {branch.code}
						</p>
						<h2 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.06em]">
							{branch.name}
						</h2>
						<p className="mt-2 text-sm text-[#12324a]/55">/{branch.slug}</p>
					</div>
					<StatusBadge status={branch.status} />
				</div>

				<div className="mt-8 grid gap-4 border-t border-[#12324a]/10 pt-6 sm:grid-cols-2">
					<InfoCard
						label="Dirección"
						value={branch.address}
						icon={<MapPin />}
					/>
					<InfoCard
						label="Ubicación"
						value={`${branch.district}, ${branch.province}, ${branch.department}`}
						icon={<MapPin />}
					/>
					<InfoCard label="Teléfono" value={branch.phone} icon={<Phone />} />
					<InfoCard
						label="Email"
						value={branch.email ?? "Sin email configurado"}
						icon={<Mail />}
					/>
				</div>
			</section>

			<StaffBranchDetailsForm
				branch={branch}
				session={session}
				userId={userId}
			/>
			<StaffBranchRulesForm branch={branch} session={session} userId={userId} />

			<div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
				<section className="rounded-3xl border border-[#12324a]/10 bg-white/80 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.05)]">
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e76832]">
								Horario semanal
							</p>
							<h3 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.04em]">
								Atención configurada
							</h3>
						</div>
						<span className="rounded-full bg-[#dcecef] px-3 py-1 text-xs font-semibold text-[#236d7d]">
							{branch.intervals.length} intervalos
						</span>
					</div>
					<p className="mt-5 text-sm leading-7 text-[#12324a]/65">
						{formatSchedule(branch)}
					</p>
				</section>

				<section className="rounded-3xl border border-[#12324a]/10 bg-white/80 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.05)]">
					<p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e76832]">
						Reglas de reserva
					</p>
					<h3 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.04em]">
						Configuración operativa
					</h3>
					<div className="mt-5 grid grid-cols-2 gap-3 text-sm">
						<RuleCard
							label="Duración"
							value={`${branch.rules.defaultReservationDurationMinutes} min`}
						/>
						<RuleCard
							label="Anticipación mínima"
							value={`${branch.rules.minimumAdvanceMinutes} min`}
						/>
						<RuleCard
							label="Anticipación máxima"
							value={`${branch.rules.maximumAdvanceDays} días`}
						/>
						<RuleCard
							label="Tolerancia"
							value={`${branch.rules.arrivalToleranceMinutes} min`}
						/>
						<RuleCard
							label="Grupo máximo"
							value={`${branch.rules.maxPartySize} personas`}
						/>
					</div>
				</section>
			</div>
		</div>
	);
}

function InfoCard({
	icon,
	label,
	value,
}: {
	icon: ReactNode;
	label: string;
	value: string;
}) {
	return (
		<div className="rounded-2xl border border-[#12324a]/10 bg-[#f4f0e8]/55 p-4">
			<div className="flex items-center gap-2 text-[#e76832]">
				<span aria-hidden="true" className="[&_svg]:size-4">
					{icon}
				</span>
				<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#12324a]/45">
					{label}
				</p>
			</div>
			<p className="mt-2 break-words text-sm font-semibold">{value}</p>
		</div>
	);
}

function RuleCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-2xl border border-[#12324a]/10 bg-[#f4f0e8]/55 p-4">
			<p className="text-xs text-[#12324a]/50">{label}</p>
			<p className="mt-1 font-semibold">{value}</p>
		</div>
	);
}

function StatusBadge({ status }: { status: StaffBranch["status"] }) {
	return (
		<span
			className={`inline-flex rounded-full px-4 py-2 text-sm font-bold ${status === "active" ? "bg-[#dcecef] text-[#236d7d]" : "bg-[#12324a]/8 text-[#12324a]/65"}`}
		>
			{status === "active" ? "Activa" : "Inactiva"}
		</span>
	);
}

function DetailErrorState({
	error,
	onRetry,
}: {
	error: unknown;
	onRetry: () => void;
}) {
	const errorCode = error instanceof ApiClientError ? error.code : null;
	const isNotFound = errorCode === "BRANCH_NOT_FOUND";
	const isForbidden = errorCode === "FORBIDDEN";
	const message = isNotFound
		? "La sucursal que buscas no existe o ya no pertenece a este restaurante."
		: isForbidden
			? "No tienes permisos para administrar esta sucursal."
			: errorCode === "NETWORK_ERROR"
				? "No se pudo conectar con el servidor."
				: "No se pudo cargar la sucursal.";

	return (
		<DetailStatus
			action={
				<div className="flex flex-wrap justify-center gap-3">
					{!isNotFound && !isForbidden ? (
						<Button onClick={onRetry} variant="outline">
							Reintentar
						</Button>
					) : null}
					<Button render={<a href="/staff/branches" />}>
						Volver a sucursales
					</Button>
				</div>
			}
			message={message}
		/>
	);
}

function DetailStatus({
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
			className="grid min-h-64 place-items-center rounded-3xl border border-[#12324a]/10 bg-white/80 p-8 text-center shadow-[0_20px_60px_rgba(18,50,74,0.06)]"
			role={busy ? "status" : "alert"}
		>
			<div className="space-y-5">
				<p className="max-w-lg text-sm leading-6 text-[#12324a]/70">
					{message}
				</p>
				{action}
			</div>
		</div>
	);
}

function formatSchedule(branch: StaffBranch): string {
	if (branch.intervals.length === 0) return "No hay horarios configurados.";

	const dayLabels = [
		"",
		"Lunes",
		"Martes",
		"Miércoles",
		"Jueves",
		"Viernes",
		"Sábado",
		"Domingo",
	];
	const grouped = new Map<number, string[]>();

	for (const interval of branch.intervals) {
		const times = grouped.get(interval.dayOfWeek) ?? [];
		times.push(`${interval.startTime}–${interval.endTime}`);
		grouped.set(interval.dayOfWeek, times);
	}

	return Array.from(grouped.entries())
		.sort(([firstDay], [secondDay]) => firstDay - secondDay)
		.map(([day, times]) => `${dayLabels[day]}: ${times.join(", ")}`)
		.join(" · ");
}
