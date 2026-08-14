import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PublicCartQuantityControlProps {
	itemName: string;
	quantity: number;
	onDecrease: () => void;
	onIncrease: () => void;
}

export function PublicCartQuantityControl({
	itemName,
	quantity,
	onDecrease,
	onIncrease,
}: PublicCartQuantityControlProps) {
	return (
		<fieldset className="inline-flex items-center gap-1 rounded-full border border-[#12324a]/15 bg-[#f4f0e8] p-1">
			<legend className="sr-only">Cantidad de {itemName}</legend>
			<Button
				aria-label={`Reducir cantidad de ${itemName}`}
				className="size-10 border border-[#12324a]/10 bg-white hover:border-[#e76832]/40 hover:bg-[#fff7f1]"
				disabled={quantity <= 1}
				onClick={onDecrease}
				size="icon"
				variant="ghost"
			>
				<Minus aria-hidden="true" />
			</Button>
			<span className="min-w-10 text-center text-sm font-semibold text-[#12324a]">
				{quantity}
			</span>
			<Button
				aria-label={`Aumentar cantidad de ${itemName}`}
				className="size-10 border border-[#12324a]/10 bg-white hover:border-[#e76832]/40 hover:bg-[#fff7f1]"
				disabled={quantity >= 99}
				onClick={onIncrease}
				size="icon"
				variant="ghost"
			>
				<Plus aria-hidden="true" />
			</Button>
		</fieldset>
	);
}
