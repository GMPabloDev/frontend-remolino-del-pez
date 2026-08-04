import { Clock3 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface PublicPaymentWaitingProps {
	isRetrying?: boolean;
	message?: string;
	onRetry?(): void;
}

export function PublicPaymentWaiting({
	isRetrying = false,
	message = "Estamos esperando la confirmación segura del proveedor de pagos.",
	onRetry,
}: PublicPaymentWaitingProps) {
	return (
		<section aria-labelledby="payment-waiting-title">
			<Alert aria-live="polite">
				<Clock3 aria-hidden="true" />
				<AlertTitle id="payment-waiting-title">
					{isRetrying ? "Reintentando consulta" : "Confirmando tu pago"}
				</AlertTitle>
				<AlertDescription>{message}</AlertDescription>
			</Alert>
			{onRetry ? (
				<Button
					className="mt-5"
					disabled={isRetrying}
					onClick={onRetry}
					variant="outline"
				>
					Consultar ahora
				</Button>
			) : null}
		</section>
	);
}
