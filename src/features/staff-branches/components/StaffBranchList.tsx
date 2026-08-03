import { MapPin, Plus, RefreshCw } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ApiClientError } from "@/lib/api/api-error";
import type { StaffBranch } from "../contracts/staff-branch.schemas";
import {
	type BranchStatusFilter,
	getBranchStatusQuery,
} from "../lib/branch-status-filter";

const DAY_LABELS = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const FILTER_OPTIONS: Array<{
	label: string;
	value: BranchStatusFilter;
}> = [
	{ label: "Todas", value: "all" },
	{ label: "Activas", value: "active" },
	{ label: "Inactivas", value: "inactive" },
];

interface StaffBranchListProps {
	branches: StaffBranch[];
	filter: BranchStatusFilter;
	canCreate: boolean;
	isLoading: boolean;
	isError: boolean;
	error: unknown;
	onRetry: () => void;
}

export function StaffBranchList({
	branches,
	filter,
	canCreate,
	isLoading,
	isError,
	error,
	onRetry,
}: StaffBranchListProps) {
	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 rounded-3xl border border-[#12324a]/10 bg-white/80 p-5 shadow-[0_20px_60px_rgba(18,50,74,0.06)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
				<div>
					<p className="text-sm text-[#12324a]/65">
						Administra la información y operación de cada sede.
					</p>
					<nav aria-label="Filtrar sucursales" className="mt-4">
						<ul className="flex flex-wrap gap-2">
							{FILTER_OPTIONS.map((option) => (
								<li key={option.value}>
									<a
										aria-current={filter === option.value ? "page" : undefined}
										className={getFilterClassName(filter === option.value)}
										href={getFilterHref(option.value)}
										onClick={(event) => handleFilterClick(event, option.value)}
									>
										{option.label}
									</a>
								</li>
							))}
						</ul>
					</nav>
				</div>
				{canCreate ? (
					<Button
						nativeButton={false}
						render={<a href="/staff/branches/new" />}
					>
						<Plus aria-hidden="true" />
						Nueva sucursal
					</Button>
				) : null}
			</div>

			{isLoading ? <ListStatus message="Cargando sucursales…" busy /> : null}
			{isError ? (
				<ListStatus
					action={
						<Button onClick={onRetry} variant="outline">
							<RefreshCw aria-hidden="true" />
							Reintentar
						</Button>
					}
					message={getBranchErrorMessage(error)}
				/>
			) : null}
			{!isLoading && !isError && branches.length === 0 ? (
				<EmptyBranchState canCreate={canCreate} />
			) : null}
			{!isLoading && !isError && branches.length > 0 ? (
				<>
					<DesktopBranchTable branches={branches} />
					<MobileBranchCards branches={branches} />
				</>
			) : null}
		</div>
	);
}

function DesktopBranchTable({ branches }: { branches: StaffBranch[] }) {
	return (
		<div className="hidden overflow-hidden rounded-3xl border border-[#12324a]/10 bg-white/90 shadow-[0_20px_60px_rgba(18,50,74,0.06)] md:block">
			<Table className="border-collapse text-left">
				<TableCaption className="sr-only">
					Sucursales del restaurante
				</TableCaption>
				<TableHeader className="bg-[#12324a] text-xs uppercase tracking-[0.16em] text-white/75">
					<TableRow className="border-0 hover:bg-transparent">
						<TableHead className="px-6 py-4 font-semibold text-white/75">
							Sucursal
						</TableHead>
						<TableHead className="px-6 py-4 font-semibold text-white/75">
							Ubicación
						</TableHead>
						<TableHead className="px-6 py-4 font-semibold text-white/75">
							Estado
						</TableHead>
						<TableHead className="px-6 py-4 font-semibold text-white/75">
							Horario
						</TableHead>
						<TableHead className="px-6 py-4 text-right font-semibold text-white/75">
							Acción
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="divide-y divide-[#12324a]/10">
					{branches.map((branch) => (
						<TableRow key={branch.id} className="align-top">
							<TableCell className="px-6 py-5 whitespace-normal">
								<p className="font-semibold">{branch.name}</p>
								<p className="mt-1 text-xs text-[#12324a]/55">
									Código {branch.code}
								</p>
							</TableCell>
							<TableCell className="max-w-56 px-6 py-5 text-sm text-[#12324a]/65 whitespace-normal">
								{formatLocation(branch)}
							</TableCell>
							<TableCell className="px-6 py-5">
								<BranchStatusBadge status={branch.status} />
							</TableCell>
							<TableCell className="max-w-72 px-6 py-5 text-sm leading-6 text-[#12324a]/65 whitespace-normal">
								{formatSchedule(branch)}
							</TableCell>
							<TableCell className="px-6 py-5 text-right">
								<div className="flex flex-wrap justify-end gap-2">
									<ManageBranchLink branchId={branch.id} />
									<ManageTablesLink branchId={branch.id} />
									<ManageMenuLink branchId={branch.id} />
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function MobileBranchCards({ branches }: { branches: StaffBranch[] }) {
	return (
		<div className="grid gap-4 md:hidden">
			{branches.map((branch) => (
				<article
					className="rounded-3xl border border-[#12324a]/10 bg-white/90 p-5 shadow-[0_20px_60px_rgba(18,50,74,0.06)]"
					key={branch.id}
				>
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e76832]">
								Sucursal
							</p>
							<h2 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.045em]">
								{branch.name}
							</h2>
							<p className="mt-1 text-xs text-[#12324a]/55">
								Código {branch.code}
							</p>
						</div>
						<BranchStatusBadge status={branch.status} />
					</div>
					<div className="mt-5 space-y-3 border-y border-[#12324a]/10 py-4 text-sm leading-6 text-[#12324a]/65">
						<p className="flex items-start gap-2.5">
							<MapPin
								aria-hidden="true"
								className="mt-1 shrink-0 text-[#e76832]"
								size={16}
							/>
							<span>{formatLocation(branch)}</span>
						</p>
						<p>
							<strong className="font-semibold text-[#12324a]">Horario:</strong>{" "}
							{formatSchedule(branch)}
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<ManageBranchLink branchId={branch.id} />
						<ManageTablesLink branchId={branch.id} />
						<ManageMenuLink branchId={branch.id} />
					</div>
				</article>
			))}
		</div>
	);
}

function EmptyBranchState({ canCreate }: { canCreate: boolean }) {
	return (
		<ListStatus
			action={
				canCreate ? (
					<Button
						nativeButton={false}
						render={<a href="/staff/branches/new" />}
					>
						<Plus aria-hidden="true" />
						Crear primera sucursal
					</Button>
				) : undefined
			}
			message={
				canCreate
					? "Todavía no hay sucursales configuradas."
					: "No hay sucursales asignadas a tu usuario."
			}
		/>
	);
}

function ListStatus({
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

function BranchStatusBadge({ status }: { status: StaffBranch["status"] }) {
	const isActive = status === "active";

	return (
		<span
			className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${isActive ? "bg-[#dcecef] text-[#236d7d]" : "bg-[#12324a]/8 text-[#12324a]/65"}`}
		>
			{isActive ? "Activa" : "Inactiva"}
		</span>
	);
}

function ManageBranchLink({ branchId }: { branchId: string }) {
	return (
		<a
			className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#12324a] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4b68] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35"
			href={`/staff/branches/${encodeURIComponent(branchId)}`}
		>
			Administrar
		</a>
	);
}

function ManageTablesLink({ branchId }: { branchId: string }) {
	return (
		<a
			className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#12324a]/15 px-4 text-sm font-semibold text-[#12324a] transition hover:border-[#12324a]/30 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35"
			href={`/staff/branches/${encodeURIComponent(branchId)}/tables`}
		>
			Gestionar mesas
		</a>
	);
}

function ManageMenuLink({ branchId }: { branchId: string }) {
	return (
		<a
			className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#e76832]/30 px-4 text-sm font-semibold text-[#8f3d20] transition hover:border-[#e76832]/55 hover:bg-[#e76832]/8 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35"
			href={`/staff/branches/${encodeURIComponent(branchId)}/menu`}
		>
			Configurar menú
		</a>
	);
}

function formatLocation(branch: StaffBranch): string {
	return `${branch.address}, ${branch.district}, ${branch.province}`;
}

function formatSchedule(branch: StaffBranch): string {
	if (branch.intervals.length === 0) return "Sin horario configurado";

	const grouped = new Map<number, string[]>();
	for (const interval of branch.intervals) {
		const times = grouped.get(interval.dayOfWeek) ?? [];
		times.push(`${interval.startTime}–${interval.endTime}`);
		grouped.set(interval.dayOfWeek, times);
	}

	return Array.from(grouped.entries())
		.sort(([firstDay], [secondDay]) => firstDay - secondDay)
		.map(([day, times]) => `${DAY_LABELS[day]} ${times.join(", ")}`)
		.join(" · ");
}

function handleFilterClick(
	event: MouseEvent<HTMLAnchorElement>,
	filter: BranchStatusFilter,
): void {
	if (
		event.defaultPrevented ||
		event.button !== 0 ||
		event.metaKey ||
		event.ctrlKey ||
		event.shiftKey ||
		event.altKey
	) {
		return;
	}

	event.preventDefault();
	window.history.pushState({}, "", getFilterHref(filter));
	window.dispatchEvent(new window.Event("popstate"));
}

function getFilterHref(filter: BranchStatusFilter): string {
	const query = getBranchStatusQuery(filter);
	return query ? `/staff/branches?status=${query}` : "/staff/branches";
}

function getFilterClassName(isSelected: boolean): string {
	return isSelected
		? "inline-flex rounded-full bg-[#12324a] px-4 py-2 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35"
		: "inline-flex rounded-full border border-[#12324a]/15 px-4 py-2 text-xs font-semibold text-[#12324a]/65 transition hover:border-[#12324a]/30 hover:text-[#12324a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35";
}

function getBranchErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError && error.code === "FORBIDDEN") {
		return "No tienes permisos para consultar estas sucursales.";
	}

	if (error instanceof ApiClientError && error.code === "NETWORK_ERROR") {
		return "No se pudo conectar con el servidor.";
	}

	return "No se pudieron cargar las sucursales.";
}
