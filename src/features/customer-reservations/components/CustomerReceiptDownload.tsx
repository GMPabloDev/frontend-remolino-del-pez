import { FileDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "../../../components/ui/alert";
import { Button } from "../../../components/ui/button";
import type { CustomerReservationsClient } from "../api/customer-reservations-client";
import {
	type CustomerReceiptDownload as CustomerReceiptDownloadResult,
	isCustomerReceiptDownloadUsable,
} from "../contracts/customer-reservation.schemas";
import {
	getCustomerReceiptDownloadErrorMessage,
	isCustomerReceiptRefreshError,
} from "../lib/customer-reservation-errors";

interface CustomerReceiptDownloadProps {
	client: CustomerReservationsClient;
	reservationId: string;
	onRefresh: () => void;
}

export function CustomerReceiptDownload({
	client,
	reservationId,
	onRefresh,
}: CustomerReceiptDownloadProps) {
	const [download, setDownload] =
		useState<CustomerReceiptDownloadResult | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<unknown>(null);
	const errorRef = useRef<HTMLParagraphElement>(null);

	useEffect(() => {
		if (!download) return;

		const remainingMs = new Date(download.expiresAt).getTime() - Date.now();
		if (remainingMs <= 0) {
			setDownload(null);
			return;
		}

		const timeoutId = window.setTimeout(() => setDownload(null), remainingMs);
		return () => window.clearTimeout(timeoutId);
	}, [download]);

	useEffect(() => {
		if (error) errorRef.current?.focus();
	}, [error]);

	async function handleRequest(): Promise<void> {
		if (isLoading) return;

		setError(null);
		setIsLoading(true);

		try {
			const result = await client.getReceiptDownload(reservationId);
			if (!isCustomerReceiptDownloadUsable(result)) {
				throw new Error("EXPIRED_DOWNLOAD_URL");
			}
			setDownload(result);
		} catch (requestError) {
			setDownload(null);
			setError(requestError);
		} finally {
			setIsLoading(false);
		}
	}

	if (download) {
		return (
			<div className="flex flex-col items-start gap-2">
				<a
					className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#12324a]/20 bg-white px-3 py-2 text-sm font-medium text-[#12324a] underline-offset-4 transition-colors hover:border-[#e76832] hover:bg-[#fff7f1] hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/25"
					download={download.fileName}
					href={download.downloadUrl}
					referrerPolicy="no-referrer"
				>
					<FileDown aria-hidden="true" className="size-4" />
					Descargar comprobante PDF
				</a>
				<p className="text-xs text-[#12324a]/60">
					Enlace disponible durante unos minutos.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-start gap-3">
			<Button
				disabled={isLoading}
				onClick={() => void handleRequest()}
				type="button"
				variant="outline"
			>
				{isLoading ? "Generando enlace…" : "Generar enlace de descarga"}
			</Button>
			{error ? (
				<Alert className="w-full" variant="destructive">
					<AlertTitle>No pudimos preparar el comprobante</AlertTitle>
					<AlertDescription>
						<p ref={errorRef} tabIndex={-1}>
							{getCustomerReceiptDownloadErrorMessage(error)}
						</p>
						<div className="mt-3 flex flex-wrap gap-2">
							<Button
								onClick={() => void handleRequest()}
								type="button"
								variant="outline"
							>
								Reintentar
							</Button>
							{isCustomerReceiptRefreshError(error) ? (
								<Button onClick={onRefresh} type="button" variant="ghost">
									Actualizar historial
								</Button>
							) : null}
						</div>
					</AlertDescription>
				</Alert>
			) : null}
		</div>
	);
}
