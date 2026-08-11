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

	if (remainingMs === 0) {
		return (
			<div
				aria-live="polite"
				className="rounded-lg border border-[#b34b25]/30 bg-[#fff4ef] p-3"
			>
				<p className="font-medium text-destructive">Reserva vencida</p>
				<p className="mt-1 text-sm text-muted-foreground">
					El bloqueo temporal ya no está vigente.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-[#12324a]/15 bg-[#e8f2f4] p-3 shadow-sm">
			<div className="flex items-center justify-between gap-4">
				<p className="text-sm font-medium">Tiempo para continuar</p>
				<time
					aria-label={`Quedan ${formatCountdown(remainingMs)}`}
					className="font-mono text-lg font-semibold tabular-nums"
					dateTime={expiresAt}
					role="timer"
				>
					{formatCountdown(remainingMs)}
				</time>
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
