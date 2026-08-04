import { useEffect, useRef } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface PublicPaymentResultStateProps {
	description: string;
	primaryActionLabel: string;
	onPrimaryAction(): void;
	onSecondaryAction?(): void;
	secondaryActionLabel?: string;
	title: string;
	variant?: "default" | "destructive";
}

export function PublicPaymentResultState({
	description,
	primaryActionLabel,
	onPrimaryAction,
	onSecondaryAction,
	secondaryActionLabel,
	title,
	variant = "default",
}: PublicPaymentResultStateProps) {
	const sectionReference = useRef<HTMLElement>(null);

	useEffect(() => {
		sectionReference.current?.focus();
	}, []);

	return (
		<section
			aria-labelledby="payment-result-state-title"
			ref={sectionReference}
			tabIndex={-1}
		>
			<Alert aria-live="assertive" variant={variant}>
				<AlertTitle id="payment-result-state-title">{title}</AlertTitle>
				<AlertDescription>{description}</AlertDescription>
			</Alert>
			<div className="mt-5 flex flex-wrap gap-3">
				<Button onClick={onPrimaryAction}>{primaryActionLabel}</Button>
				{onSecondaryAction && secondaryActionLabel ? (
					<Button onClick={onSecondaryAction} variant="outline">
						{secondaryActionLabel}
					</Button>
				) : null}
			</div>
		</section>
	);
}
