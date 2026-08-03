import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface DynamicStringListFieldProps {
	id: string;
	label: string;
	description: string;
	placeholder: string;
	values: string[];
	onChange: (values: string[]) => void;
	itemErrors?: Array<{ message?: string } | undefined>;
	max: number;
	error?: string;
}

export function DynamicStringListField({
	id,
	label,
	description,
	placeholder,
	values,
	onChange,
	itemErrors = [],
	max,
	error,
}: DynamicStringListFieldProps) {
	const [pendingValue, setPendingValue] = useState("");
	const [listMessage, setListMessage] = useState("");

	function addValue(): void {
		const normalizedValue = pendingValue.trim();
		if (!normalizedValue) {
			setListMessage(
				`Escribe un valor para añadirlo a ${label.toLowerCase()}.`,
			);
			return;
		}
		if (normalizedValue.length > 100) {
			setListMessage("Cada elemento no puede superar 100 caracteres.");
			return;
		}
		if (values.length >= max) {
			setListMessage(`No puedes añadir más de ${max} elementos.`);
			return;
		}
		if (
			values.some(
				(value) =>
					value.trim().toLocaleLowerCase() ===
					normalizedValue.toLocaleLowerCase(),
			)
		) {
			setListMessage("No repitas elementos sin distinguir mayúsculas.");
			return;
		}

		onChange([...values, normalizedValue]);
		setPendingValue("");
		setListMessage(`${normalizedValue} añadido.`);
	}

	function updateValue(index: number, nextValue: string): void {
		const nextValues = [...values];
		nextValues[index] = nextValue;
		onChange(nextValues);
		setListMessage("");
	}

	function removeValue(index: number): void {
		const removedValue = values[index];
		onChange(values.filter((_, valueIndex) => valueIndex !== index));
		setListMessage(
			removedValue ? `${removedValue} eliminado.` : "Elemento eliminado.",
		);
	}

	return (
		<Field data-invalid={Boolean(error)}>
			<FieldLabel htmlFor={`${id}-new`}>{label}</FieldLabel>
			<FieldDescription>{description}</FieldDescription>
			<div className="space-y-3">
				{values.map((value, index) => {
					const itemId = `${id}-${index}`;
					const errorId = `${itemId}-error`;
					return (
						<div className="flex items-start gap-2" key={itemId}>
							<div className="min-w-0 flex-1">
								<Input
									aria-describedby={itemErrors[index] ? errorId : undefined}
									aria-invalid={Boolean(itemErrors[index])}
									id={itemId}
									value={value}
									onChange={(event) => updateValue(index, event.target.value)}
								/>
								{itemErrors[index]?.message ? (
									<p className="mt-1 text-sm text-[#8f3d20]" id={errorId}>
										{itemErrors[index]?.message}
									</p>
								) : null}
							</div>
							<Button
								aria-label={`Eliminar ${label.toLowerCase()} ${index + 1}`}
								className="min-h-10 min-w-10 shrink-0"
								onClick={() => removeValue(index)}
								type="button"
								variant="destructive"
							>
								<Trash2 aria-hidden="true" />
							</Button>
						</div>
					);
				})}

				<div className="flex items-start gap-2">
					<Input
						aria-describedby={listMessage ? `${id}-message` : undefined}
						id={`${id}-new`}
						maxLength={100}
						placeholder={placeholder}
						value={pendingValue}
						onChange={(event) => {
							setPendingValue(event.target.value);
							setListMessage("");
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								addValue();
							}
						}}
					/>
					<Button
						aria-label={`Añadir ${label.toLowerCase()}`}
						className="min-h-10 min-w-10 shrink-0"
						onClick={addValue}
						type="button"
						variant="outline"
					>
						<Plus aria-hidden="true" />
					</Button>
				</div>
			</div>
			{listMessage ? (
				<p
					aria-live="polite"
					className="mt-2 text-sm text-[#236d7d]"
					id={`${id}-message`}
				>
					{listMessage}
				</p>
			) : null}
			<FieldError errors={error ? [{ message: error }] : undefined} />
		</Field>
	);
}
