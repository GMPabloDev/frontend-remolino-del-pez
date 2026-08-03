import { Plus, RefreshCw } from "lucide-react";
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
import type { StaffTable, TableStatus } from "../contracts/staff-table.schemas";
import {
	getTableStatusQuery,
	type TableStatusFilter,
} from "../lib/table-status-filter";

const FILTER_OPTIONS: Array<{
	label: string;
	value: TableStatusFilter;
}> = [
	{ label: "Todas", value: "all" },
	{ label: "Activas", value: "active" },
	{ label: "Inactivas", value: "inactive" },
];

interface StaffTableListProps {
	branchId: string;
	branchName: string;
	tables: StaffTable[];
	filter: TableStatusFilter;
	canCreate: boolean;
	isLoading: boolean;
	isError: boolean;
	error: unknown;
	onRetry: () => void;
}

export function StaffTableList({
	branchId,
	branchName,
	tables,
	filter,
	canCreate,
	isLoading,
	isError,
	error,
	onRetry,
}: StaffTableListProps) {
	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 rounded-3xl border border-[#12324a]/10 bg-white/80 p-5 shadow-[0_20px_60px_rgba(18,50,74,0.06)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
				<div>
					<p className="text-sm text-[#12324a]/65">
						Mesas configuradas en {branchName}.
					</p>
					<nav aria-label="Filtrar mesas" className="mt-4">
						<ul className="flex flex-wrap gap-2">
							{FILTER_OPTIONS.map((option) => (
								<li key={option.value}>
									<a
										aria-current={filter === option.value ? "page" : undefined}
										className={getFilterClassName(filter === option.value)}
										href={getFilterHref(branchId, option.value)}
										onClick={(event) =>
											handleFilterClick(event, branchId, option.value)
										}
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
						render={<a href={getCreateHref(branchId)} />}
					>
						<Plus aria-hidden="true" />
						Nueva mesa
					</Button>
				) : null}
			</div>

			{isLoading ? <ListStatus message="Cargando mesas…" busy /> : null}
			{isError ? (
				<ListStatus
					action={
						<Button onClick={onRetry} variant="outline">
							<RefreshCw aria-hidden="true" />
							Reintentar
						</Button>
					}
					message={getTableErrorMessage(error)}
				/>
			) : null}
			{!isLoading && !isError && tables.length === 0 ? (
				<EmptyTableState branchId={branchId} canCreate={canCreate} />
			) : null}
			{!isLoading && !isError && tables.length > 0 ? (
				<>
					<DesktopTableList branchId={branchId} tables={tables} />
					<MobileTableCards branchId={branchId} tables={tables} />
				</>
			) : null}
		</div>
	);
}

function DesktopTableList({
	branchId,
	tables,
}: {
	branchId: string;
	tables: StaffTable[];
}) {
	return (
		<div className="hidden overflow-hidden rounded-3xl border border-[#12324a]/10 bg-white/90 shadow-[0_20px_60px_rgba(18,50,74,0.06)] md:block">
			<Table className="border-collapse text-left">
				<TableCaption className="sr-only">Mesas de la sucursal</TableCaption>
				<TableHeader className="bg-[#12324a] text-xs uppercase tracking-[0.16em] text-white/75">
					<TableRow className="border-0 hover:bg-transparent">
						<TableHead className="px-6 py-4 font-semibold text-white/75">
							Código
						</TableHead>
						<TableHead className="px-6 py-4 font-semibold text-white/75">
							Capacidad
						</TableHead>
						<TableHead className="px-6 py-4 font-semibold text-white/75">
							Estado
						</TableHead>
						<TableHead className="px-6 py-4 text-right font-semibold text-white/75">
							Acción
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="divide-y divide-[#12324a]/10">
					{tables.map((table) => (
						<TableRow key={table.id} className="align-top">
							<TableCell className="px-6 py-5 font-semibold whitespace-normal">
								{table.code}
							</TableCell>
							<TableCell className="px-6 py-5 text-sm text-[#12324a]/65">
								{table.capacity} personas
							</TableCell>
							<TableCell className="px-6 py-5">
								<TableStatusBadge status={table.status} />
							</TableCell>
							<TableCell className="px-6 py-5 text-right">
								<ManageTableLink branchId={branchId} tableId={table.id} />
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function MobileTableCards({
	branchId,
	tables,
}: {
	branchId: string;
	tables: StaffTable[];
}) {
	return (
		<div className="grid gap-4 md:hidden">
			{tables.map((table) => (
				<article
					className="rounded-3xl border border-[#12324a]/10 bg-white/90 p-5 shadow-[0_20px_60px_rgba(18,50,74,0.06)]"
					key={table.id}
				>
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e76832]">
								Mesa
							</p>
							<h2 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.045em]">
								{table.code}
							</h2>
						</div>
						<TableStatusBadge status={table.status} />
					</div>
					<p className="mt-5 border-y border-[#12324a]/10 py-4 text-sm text-[#12324a]/65">
						<strong className="font-semibold text-[#12324a]">Capacidad:</strong>{" "}
						{table.capacity} personas
					</p>
					<ManageTableLink branchId={branchId} tableId={table.id} />
				</article>
			))}
		</div>
	);
}

function EmptyTableState({
	branchId,
	canCreate,
}: {
	branchId: string;
	canCreate: boolean;
}) {
	return (
		<ListStatus
			action={
				canCreate ? (
					<Button
						nativeButton={false}
						render={<a href={getCreateHref(branchId)} />}
					>
						<Plus aria-hidden="true" />
						Crear primera mesa
					</Button>
				) : undefined
			}
			message={
				canCreate
					? "Todavía no hay mesas configuradas en esta sucursal."
					: "No hay mesas asignadas a tu usuario."
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

function TableStatusBadge({ status }: { status: TableStatus }) {
	const isActive = status === "active";

	return (
		<span
			className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${isActive ? "bg-[#dcecef] text-[#236d7d]" : "bg-[#12324a]/8 text-[#12324a]/65"}`}
		>
			{isActive ? "Activa" : "Inactiva"}
		</span>
	);
}

function ManageTableLink({
	branchId,
	tableId,
}: {
	branchId: string;
	tableId: string;
}) {
	return (
		<a
			className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#12324a] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4b68] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35"
			href={`/staff/branches/${encodeURIComponent(branchId)}/tables/${encodeURIComponent(tableId)}`}
		>
			Administrar
		</a>
	);
}

function handleFilterClick(
	event: MouseEvent<HTMLAnchorElement>,
	branchId: string,
	filter: TableStatusFilter,
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
	window.history.pushState({}, "", getFilterHref(branchId, filter));
	window.dispatchEvent(new window.Event("popstate"));
}

function getFilterHref(branchId: string, filter: TableStatusFilter): string {
	const query = getTableStatusQuery(filter);
	const basePath = `/staff/branches/${encodeURIComponent(branchId)}/tables`;
	return query ? `${basePath}?status=${query}` : basePath;
}

function getCreateHref(branchId: string): string {
	return `/staff/branches/${encodeURIComponent(branchId)}/tables/new`;
}

function getFilterClassName(isSelected: boolean): string {
	return isSelected
		? "inline-flex rounded-full bg-[#12324a] px-4 py-2 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35"
		: "inline-flex rounded-full border border-[#12324a]/15 px-4 py-2 text-xs font-semibold text-[#12324a]/65 transition hover:border-[#12324a]/30 hover:text-[#12324a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35";
}

function getTableErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		if (error.code === "FORBIDDEN") {
			return "No tienes permisos para consultar las mesas de esta sucursal.";
		}

		if (error.code === "BRANCH_NOT_FOUND") {
			return "La sucursal no existe o no está disponible.";
		}

		if (error.code === "NETWORK_ERROR" || error.status === 0) {
			return "No se pudo conectar con el servidor.";
		}
	}

	return "No se pudieron cargar las mesas.";
}
