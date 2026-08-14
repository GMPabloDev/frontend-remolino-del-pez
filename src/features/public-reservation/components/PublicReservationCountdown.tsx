import { Clock3 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface PublicReservationCountdownProps {
	createdAt: string;
	expiresAt: string;
	onExpire(): void;
}

export function PublicReservationCountdown({
	createdAt,
	expiresAt,
	onExpire,
}: PublicReservationCountdownProps) {
	const createdAtMs = Date.parse(createdAt);
	const expiresAtMs = Date.parse(expiresAt);
	const initialRemainingMs = getInitialRemainingMs(createdAtMs, expiresAtMs);
	const monotonicStart = useRef(getMonotonicTime());
	const expiredReference = useRef(false);
	const onExpireReference = useRef(onExpire);
	const [remainingMs, setRemainingMs] = useState(initialRemainingMs);
	const [announcement, setAnnouncement] = useState(
		getCountdownAnnouncement(initialRemainingMs),
	);

	onExpireReference.current = onExpire;

	useEffect(() => {
		monotonicStart.current = getMonotonicTime();
		expiredReference.current = false;
		setRemainingMs(initialRemainingMs);
		setAnnouncement(getCountdownAnnouncement(initialRemainingMs));
	}, [initialRemainingMs]);

	useEffect(() => {
		function updateCountdown() {
			const elapsedMs = getMonotonicTime() - monotonicStart.current;
			const nextRemainingMs = Math.max(0, initialRemainingMs - elapsedMs);
			setRemainingMs(nextRemainingMs);

			const nextAnnouncement = getCountdownAnnouncement(nextRemainingMs);
			setAnnouncement((currentAnnouncement) =>
				currentAnnouncement === nextAnnouncement
					? currentAnnouncement
					: nextAnnouncement,
			);

			if (nextRemainingMs === 0 && !expiredReference.current) {
				expiredReference.current = true;
				onExpireReference.current();
			}
		}

		updateCountdown();
		const intervalId = window.setInterval(updateCountdown, 1000);
		return () => window.clearInterval(intervalId);
	}, [initialRemainingMs]);

	const totalDurationMs = Math.max(1, expiresAtMs - createdAtMs);
	const remainingPercentage = Math.min(
		100,
		Math.max(0, (remainingMs / totalDurationMs) * 100),
	);

	if (remainingMs === 0) {
		return (
			<div
				aria-live="polite"
				className="rounded-2xl border border-[#b34b25]/30 bg-[#fff4ef] p-4"
			>
				<p className="font-semibold text-[#8f3d20]">Reserva vencida</p>
				<p className="mt-1 text-sm text-[#8f3d20]/80">
					El bloqueo temporal ya no está vigente.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-[#12324a]/12 bg-[#dcecef]/70 p-4 sm:p-5">
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<span className="grid size-9 place-items-center rounded-full bg-white text-[#12324a] shadow-[0_8px_20px_rgba(18,50,74,0.08)]">
						<Clock3 aria-hidden="true" className="size-4" />
					</span>
					<div>
						<p className="text-sm font-semibold text-[#12324a]">
							Tiempo para pagar
						</p>
						<p className="text-xs text-[#587080]">La mesa sigue apartada</p>
					</div>
				</div>
				<time
					aria-label={`Quedan ${formatCountdown(remainingMs)}`}
					className="text-2xl font-bold tabular-nums tracking-[-0.03em] text-[#12324a] sm:text-3xl"
					dateTime={expiresAt}
					role="timer"
				>
					{formatCountdown(remainingMs)}
				</time>
			</div>
			<div
				aria-hidden="true"
				className="mt-4 h-1.5 overflow-hidden rounded-full bg-white"
			>
				<div
					className="h-full rounded-full bg-[#e76832] transition-[width] duration-1000 ease-linear"
					style={{ width: `${remainingPercentage}%` }}
				/>
			</div>
			<p aria-live="polite" className="sr-only">
				{announcement}
			</p>
		</div>
	);
}

function getInitialRemainingMs(
	createdAtMs: number,
	expiresAtMs: number,
): number {
	if (
		!Number.isFinite(createdAtMs) ||
		!Number.isFinite(expiresAtMs) ||
		expiresAtMs <= createdAtMs
	) {
		return 0;
	}

	const currentMs = Math.max(Date.now(), createdAtMs);
	return Math.max(0, expiresAtMs - currentMs);
}

function getMonotonicTime(): number {
	return globalThis.performance?.now() ?? Date.now();
}

function formatCountdown(remainingMs: number): string {
	const totalSeconds = Math.ceil(remainingMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;

	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getCountdownAnnouncement(remainingMs: number): string {
	if (remainingMs <= 0) return "La reserva temporal venció.";

	const totalMinutes = Math.ceil(remainingMs / 60_000);
	return `Quedan aproximadamente ${totalMinutes} ${totalMinutes === 1 ? "minuto" : "minutos"} para continuar.`;
}
