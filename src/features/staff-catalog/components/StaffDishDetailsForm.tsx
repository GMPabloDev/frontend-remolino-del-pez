import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import {
	Controller,
	type FieldErrors,
	useForm,
	useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { StaffSessionAccess } from "@/features/staff-auth/session/staff-session";
import { useStaffUnsavedChanges } from "@/features/staff-shell/components/StaffUnsavedChangesProvider";
import { ApiClientError } from "@/lib/api/api-error";
import type {
	MenuCategory,
	StaffDish,
} from "../contracts/staff-catalog.schemas";
import {
	type DishFormValues,
	dishFormSchema,
	toUpdateDishRequest,
} from "../contracts/staff-catalog-form.schemas";
import {
	hasCatalogUpdatedAtConflict,
	readStaffCatalogDraft,
	removeStaffCatalogDraft,
	type StoredCatalogDraft,
	saveStaffCatalogDraft,
} from "../lib/staff-catalog-drafts";
import { useUpdateDishMutation } from "../query/staff-catalog-query";
import { CatalogStatusBadge } from "./CatalogStatusBadge";
import { DishImageUrlField } from "./DishImageUrlField";
import { DynamicStringListField } from "./DynamicStringListField";

interface StaffDishDetailsFormProps {
	categories: MenuCategory[];
	dish: StaffDish;
	session: StaffSessionAccess;
	userId: string;
}

export function StaffDishDetailsForm({
	categories,
	dish,
	session,
	userId,
}: StaffDishDetailsFormProps) {
	const [draft, setDraft] = useState<StoredCatalogDraft<
		DishFormValues,
		string
	> | null>(null);
	const updateMutation = useUpdateDishMutation(session);
	const {
		control,
		formState: { errors, isDirty, isSubmitting },
		handleSubmit,
		register,
		reset,
		setError,
		setFocus,
	} = useForm<DishFormValues>({
		defaultValues: getDefaultValues(dish),
		mode: "onSubmit",
		resolver: zodResolver(dishFormSchema),
		shouldFocusError: false,
	});
	const values = useWatch({ control }) as DishFormValues;
	const hasDraftConflict = draft
		? hasCatalogUpdatedAtConflict(draft.base, dish.updatedAt)
		: false;
	useStaffUnsavedChanges("dish-details", isDirty);

	useEffect(() => {
		reset(getDefaultValues(dish));
	}, [dish, reset]);

	useEffect(() => {
		setDraft(
			readStaffCatalogDraft({
				userId,
				section: "dish-details",
				resourceId: dish.id,
				valuesSchema: dishFormSchema,
				baseSchema: z.string(),
			}),
		);
	}, [dish.id, userId]);

	useEffect(() => {
		if (!isDirty) return;
		saveStaffCatalogDraft({
			userId,
			section: "dish-details",
			resourceId: dish.id,
			base: dish.updatedAt,
			values,
			valuesSchema: dishFormSchema,
			baseSchema: z.string(),
		});
	}, [dish.id, dish.updatedAt, isDirty, userId, values]);

	async function handleValidSubmit(formValues: DishFormValues): Promise<void> {
		try {
			const updatedDish = await updateMutation.mutateAsync({
				dishId: dish.id,
				input: toUpdateDishRequest(formValues),
			});
			removeStaffCatalogDraft(userId, "dish-details", dish.id);
			setDraft(null);
			reset(getDefaultValues(updatedDish));
			toast.success("Los datos del plato fueron guardados.");
		} catch (error) {
			if (
				error instanceof ApiClientError &&
				error.code === "DISH_NAME_ALREADY_EXISTS"
			) {
				setError("name", {
					message: "Este nombre ya está registrado en el restaurante.",
					type: "server",
				});
				setFocus("name");
				return;
			}
			toast.error(getDishUpdateErrorMessage(error));
		}
	}

	function handleInvalidSubmit(formErrors: FieldErrors<DishFormValues>) {
		if (formErrors.name) setFocus("name");
		else if (formErrors.description) setFocus("description");
		else if (formErrors.categoryId) setFocus("categoryId");
		else if (formErrors.position) setFocus("position");
		else if (formErrors.imageUrl) setFocus("imageUrl");
	}

	function recoverDraft(): void {
		if (!draft) return;
		reset(draft.values, { keepDefaultValues: true });
		setDraft(null);
	}

	function discardDraft(): void {
		removeStaffCatalogDraft(userId, "dish-details", dish.id);
		setDraft(null);
	}

	return (
		<section className="rounded-3xl border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.08)] sm:p-8">
			<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e76832]">
						Datos del plato
					</p>
					<h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.05em]">
						Editar plato
					</h2>
					<FieldDescription>
						Actualiza todos los datos del plato en un único guardado.
					</FieldDescription>
				</div>
				<CatalogStatusBadge status={dish.status} />
			</div>

			<form
				className="space-y-8"
				noValidate
				onSubmit={(event) => {
					void handleSubmit(handleValidSubmit, handleInvalidSubmit)(event);
				}}
			>
				<FieldSet>
					<FieldGroup className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
						<Field data-invalid={Boolean(errors.name)}>
							<FieldLabel htmlFor="dish-details-name">Nombre</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.name)}
								id="dish-details-name"
								{...register("name")}
							/>
							<FieldError errors={[errors.name]} />
						</Field>
						<Field data-invalid={Boolean(errors.position)}>
							<FieldLabel htmlFor="dish-details-position">Posición</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.position)}
								id="dish-details-position"
								min={1}
								type="number"
								{...register("position", { valueAsNumber: true })}
							/>
							<FieldError errors={[errors.position]} />
						</Field>
					</FieldGroup>
					<Field data-invalid={Boolean(errors.description)}>
						<FieldLabel htmlFor="dish-details-description">
							Descripción
						</FieldLabel>
						<textarea
							aria-invalid={Boolean(errors.description)}
							className="min-h-32 w-full resize-y rounded-xl border border-[#12324a]/15 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-[#12324a]/40 focus-visible:border-[#e76832] focus-visible:ring-4 focus-visible:ring-[#e76832]/15"
							id="dish-details-description"
							{...register("description")}
						/>
						<FieldError errors={[errors.description]} />
					</Field>
				</FieldSet>

				<Controller
					control={control}
					name="categoryId"
					render={({ field }) => (
						<Field data-invalid={Boolean(errors.categoryId)}>
							<FieldLabel htmlFor="dish-details-category">Categoría</FieldLabel>
							<select
								aria-describedby="dish-details-category-description"
								aria-invalid={Boolean(errors.categoryId)}
								className="min-h-10 w-full rounded-xl border border-[#12324a]/15 bg-white px-3 text-sm outline-none transition focus-visible:border-[#e76832] focus-visible:ring-4 focus-visible:ring-[#e76832]/15"
								id="dish-details-category"
								{...field}
							>
								{categories.map((category) => (
									<option key={category.id} value={category.id}>
										{category.name} ({getStatusLabel(category.status)})
									</option>
								))}
							</select>
							<p
								className="text-xs text-[#12324a]/55"
								id="dish-details-category-description"
							>
								Cambiar de categoría actualiza la agrupación del plato, pero no
								su posición.
							</p>
							<FieldError errors={[errors.categoryId]} />
						</Field>
					)}
				/>

				<div className="grid gap-7 lg:grid-cols-2">
					<Controller
						control={control}
						name="ingredients"
						render={({ field }) => (
							<DynamicStringListField
								description="Hasta 50 elementos, sin duplicados."
								error={getErrorMessage(errors.ingredients)}
								id="dish-details-ingredients"
								itemErrors={getListErrors(errors.ingredients)}
								label="Ingredientes"
								max={50}
								onChange={field.onChange}
								placeholder="Añade un ingrediente"
								values={field.value ?? []}
							/>
						)}
					/>
					<Controller
						control={control}
						name="allergens"
						render={({ field }) => (
							<DynamicStringListField
								description="Hasta 30 elementos, sin duplicados."
								error={getErrorMessage(errors.allergens)}
								id="dish-details-allergens"
								itemErrors={getListErrors(errors.allergens)}
								label="Alérgenos"
								max={30}
								onChange={field.onChange}
								placeholder="Añade un alérgeno"
								values={field.value ?? []}
							/>
						)}
					/>
				</div>

				<Controller
					control={control}
					name="imageUrl"
					render={({ field }) => (
						<DishImageUrlField
							error={errors.imageUrl?.message}
							onChange={field.onChange}
							value={field.value}
						/>
					)}
				/>

				<div className="flex justify-end border-t border-[#12324a]/10 pt-6">
					<Button
						disabled={isSubmitting || updateMutation.isPending || !isDirty}
						type="submit"
					>
						{updateMutation.isPending ? "Guardando…" : "Guardar datos"}
					</Button>
				</div>
			</form>

			<AlertDialog open={draft !== null} onOpenChange={() => undefined}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{hasDraftConflict
								? "El borrador está desactualizado"
								: "Encontramos un borrador"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{hasDraftConflict
								? "El plato cambió en el servidor desde que guardaste este borrador. ¿Quieres reemplazar esos cambios?"
								: "Hay datos del plato que no terminaste de guardar. Puedes recuperarlos o descartarlos."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={discardDraft}>
							Descartar
						</AlertDialogCancel>
						<AlertDialogAction onClick={recoverDraft}>
							Recuperar borrador
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}

function getDefaultValues(dish: StaffDish): DishFormValues {
	return {
		name: dish.name,
		description: dish.description,
		imageUrl: dish.imageUrl ?? "",
		ingredients: dish.ingredients,
		allergens: dish.allergens,
		categoryId: dish.categoryId,
		position: dish.position,
	};
}

function getStatusLabel(status: MenuCategory["status"]): string {
	return status === "active" ? "Activa" : "Inactiva";
}

function getErrorMessage(error: unknown): string | undefined {
	if (error && typeof error === "object" && "message" in error) {
		const message = error.message;
		return typeof message === "string" ? message : undefined;
	}
	return undefined;
}

function getListErrors(
	errors: unknown,
): Array<{ message?: string } | undefined> {
	if (!Array.isArray(errors)) return [];
	return errors.map((error) =>
		getErrorMessage(error) ? { message: getErrorMessage(error) } : undefined,
	);
}

function getDishUpdateErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		if (error.code === "FORBIDDEN")
			return "No tienes permisos para editar platos.";
		if (error.code === "DISH_NOT_FOUND")
			return "El plato ya no existe o no está disponible.";
		if (error.code === "MENU_CATEGORY_NOT_FOUND") {
			return "La categoría seleccionada ya no existe.";
		}
		if (error.code === "NETWORK_ERROR" || error.status === 0) {
			return "No se pudo conectar con el servidor. Inténtalo nuevamente.";
		}
	}
	return "No se pudieron guardar los datos del plato.";
}
