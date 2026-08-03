import { ImageOff, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface DishImageUrlFieldProps {
	value: string;
	onChange: (value: string) => void;
	error?: string;
}

export function DishImageUrlField({
	value,
	onChange,
	error,
}: DishImageUrlFieldProps) {
	const [failedUrl, setFailedUrl] = useState<string | null>(null);
	const previewUrl = getPreviewUrl(value);
	const hasLoadError = previewUrl !== null && failedUrl === previewUrl;
	const errorId = "dish-image-url-error";

	function updateValue(nextValue: string): void {
		setFailedUrl(null);
		onChange(nextValue);
	}

	return (
		<Field data-invalid={Boolean(error)}>
			<div className="flex items-start justify-between gap-3">
				<div>
					<FieldLabel htmlFor="dish-image-url">Imagen del plato</FieldLabel>
					<FieldDescription>
						Usa una URL http o https. La imagen no se sube al servidor.
					</FieldDescription>
				</div>
				{value ? (
					<Button
						aria-label="Eliminar URL de imagen"
						className="min-h-10 min-w-10 shrink-0"
						onClick={() => updateValue("")}
						type="button"
						variant="outline"
					>
						<X aria-hidden="true" />
					</Button>
				) : null}
			</div>
			<Input
				aria-describedby={error ? errorId : undefined}
				aria-invalid={Boolean(error)}
				id="dish-image-url"
				inputMode="url"
				placeholder="https://ejemplo.com/plato.jpg"
				value={value}
				onChange={(event) => updateValue(event.target.value)}
			/>
			{error ? <FieldError errors={[{ message: error }]} id={errorId} /> : null}
			{previewUrl && !hasLoadError ? (
				<div className="mt-4 overflow-hidden rounded-2xl border border-[#12324a]/10 bg-[#f4f0e8]/55">
					<img
						alt="Vista previa del plato"
						className="aspect-[16/9] w-full object-cover"
						onError={() => setFailedUrl(previewUrl)}
						onLoad={() => setFailedUrl(null)}
						src={previewUrl}
					/>
				</div>
			) : null}
			{previewUrl && hasLoadError ? (
				<div
					aria-live="polite"
					className="mt-4 flex items-center gap-3 rounded-2xl border border-[#e76832]/25 bg-[#e76832]/10 p-4 text-sm text-[#8f3d20]"
				>
					<ImageOff aria-hidden="true" className="shrink-0" />
					<span>La URL es válida, pero la imagen no pudo cargarse.</span>
				</div>
			) : null}
		</Field>
	);
}

function getPreviewUrl(value: string): string | null {
	const normalizedValue = value.trim();
	if (!normalizedValue) return null;

	try {
		const url = new URL(normalizedValue);
		return url.protocol === "http:" || url.protocol === "https:"
			? normalizedValue
			: null;
	} catch {
		return null;
	}
}
