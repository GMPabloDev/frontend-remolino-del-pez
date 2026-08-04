import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PublicCheckoutButtonProps {
	"aria-describedby"?: string;
	disabled?: boolean;
	isPending?: boolean;
	onClick(): void;
}

export function PublicCheckoutButton({
	"aria-describedby": ariaDescribedBy,
	disabled = false,
	isPending = false,
	onClick,
}: PublicCheckoutButtonProps) {
	return (
		<Button
			aria-describedby={ariaDescribedBy}
			className="mt-6 w-full"
			disabled={disabled || isPending}
			onClick={onClick}
			type="button"
		>
			{isPending ? (
				<>
					<LoaderCircle aria-hidden="true" className="animate-spin" />
					Preparando el pago…
				</>
			) : (
				"Continuar al pago"
			)}
		</Button>
	);
}
