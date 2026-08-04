import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
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
import type { MenuCategory } from "../contracts/staff-catalog.schemas";
import {
	type DishFormValues,
	dishFormSchema,
	toCreateDishRequest,
} from "../contracts/staff-catalog-form.schemas";
import {
	readStaffCatalogDraft,
	removeStaffCatalogDraft,
	type StoredCatalogDraft,
	saveStaffCatalogDraft,
} from "../lib/staff-catalog-drafts";
import { useCreateDishMutation } from "../query/staff-catalog-query";
import { DishImageUrlField } from "./DishImageUrlField";
import { DynamicStringListField } from "./DynamicStringListField";

interface StaffDishCreateFormProps {
	categories: MenuCategory[];
	initialPosition: number;
	positionsByCategory: Record<string, number>;
	session: StaffSessionAccess;
	userId: string;
}

export function StaffDishCreateForm({
	categories,
	initialPosition,
	positionsByCategory,
	session,
	userId,
}: StaffDishCreateFormProps) {
	const [draft, setDraft] = useState<StoredCatalogDraft<
		DishFormValues,
		null
	> | null>(null);
	const createMutation = useCreateDishMutation(session);
	const {
		control,
		formState: { errors, isDirty, isSubmitting },
		handleSubmit,
		register,
		reset,
		setError,
		setFocus,
		setValue,
	} = useForm<DishFormValues>({
		defaultValues: getDefaultValues(categories, initialPosition),
		mode: "onSubmit",
		resolver: zodResolver(dishFormSchema),
		shouldFocusError: false,
	});
	const values = useWatch({ control }) as DishFormValues;
	const selectedCategoryId = useWatch({ control, name: "categoryId" });
	const previousCategoryId = useRef(selectedCategoryId);
	const positionWasEdited = useRef(false);
	const skipNextPositionSync = useRef(false);
	useStaffUnsavedChanges("dish-new", isDirty);

	useEffect(() => {
		if (previousCategoryId.current === selectedCategoryId) return;
		previousCategoryId.current = selectedCategoryId;
		if (skipNextPositionSync.current) {
			skipNextPositionSync.current = false;
			return;
		}
		if (positionWasEdited.current || !selectedCategoryId) return;
		setValue("position", positionsByCategory[selectedCategoryId] ?? 1, {
			shouldDirty: true,
		});
	}, [positionsByCategory, selectedCategoryId, setValue]);

	useEffect(() => {
		setDraft(
			readStaffCatalogDraft({
				userId,
				section: "dish-new",
				valuesSchema: dishFormSchema,
				baseSchema: z.null(),
			}),
		);
	}, [userId]);

	useEffect(() => {
		if (!isDirty) return;
		saveStaffCatalogDraft({
			userId,
			section: "dish-new",
			base: null,
			values,
			valuesSchema: dishFormSchema,
			baseSchema: z.null(),
		});
	}, [isDirty, userId, values]);

	async function handleValidSubmit(formValues: DishFormValues): Promise<void> {
		try {
			const dish = await createMutation.mutateAsync(
				toCreateDishRequest(formValues),
			);
			removeStaffCatalogDraft(userId, "dish-new");
			window.location.replace(
				`/staff/catalog/dishes/${encodeURIComponent(dish.id)}?created=1`,
			);
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

			toast.error(getDishCreateErrorMessage(error));
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
		skipNextPositionSync.current = true;
		reset(draft.values, { keepDefaultValues: true });
		setDraft(null);
	}

	function discardDraft(): void {
		removeStaffCatalogDraft(userId, "dish-new");
		setDraft(null);
	}

	return (
		<>
			<form
				className="space-y-8"
				noValidate
				onSubmit={(event) => {
					void handleSubmit(handleValidSubmit, handleInvalidSubmit)(event);
				}}
			>
				<FieldSet>
					<FieldDescription>
						Registra la información global del plato. El estado inicial será
						inactivo.
					</FieldDescription>
					<FieldGroup className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
						<Field data-invalid={Boolean(errors.name)}>
							<FieldLabel htmlFor="dish-name">Nombre</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.name)}
								id="dish-name"
								placeholder="Causa limeña"
								{...register("name")}
							/>
							<FieldError errors={[errors.name]} />
						</Field>
						<Field data-invalid={Boolean(errors.position)}>
							<FieldLabel htmlFor="dish-position">Posición</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.position)}
								id="dish-position"
								min={1}
								type="number"
								{...register("position", {
									valueAsNumber: true,
									onChange: () => {
										positionWasEdited.current = true;
									},
								})}
							/>
							<FieldError errors={[errors.position]} />
						</Field>
					</FieldGroup>
					<Field data-invalid={Boolean(errors.description)}>
						<FieldLabel htmlFor="dish-description">Descripción</FieldLabel>
						<textarea
							aria-invalid={Boolean(errors.description)}
							className="min-h-32 w-full resize-y rounded-xl border border-[#12324a]/15 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-[#12324a]/40 focus-visible:border-[#e76832] focus-visible:ring-4 focus-visible:ring-[#e76832]/15"
							id="dish-description"
							placeholder="Describe el plato y sus características principales."
							{...register("description")}
						/>
						<FieldError errors={[errors.description]} />
					</Field>
				</FieldSet>

				<FieldSet>
					<Controller
						control={control}
						name="categoryId"
						render={({ field }) => (
							<Field data-invalid={Boolean(errors.categoryId)}>
								<FieldLabel htmlFor="dish-category">Categoría</FieldLabel>
								<select
									aria-describedby="dish-category-description"
									aria-invalid={Boolean(errors.categoryId)}
									className="min-h-10 w-full rounded-xl border border-[#12324a]/15 bg-white px-3 text-sm outline-none transition focus-visible:border-[#e76832] focus-visible:ring-4 focus-visible:ring-[#e76832]/15"
									id="dish-category"
									{...field}
								>
									<option value="">Selecciona una categoría</option>
									{categories.map((category) => (
										<option key={category.id} value={category.id}>
											{category.name} ({getStatusLabel(category.status)})
										</option>
									))}
								</select>
								<p
									className="text-xs text-[#12324a]/55"
									id="dish-category-description"
								>
									Las categorías inactivas también pueden seleccionarse para
									preparar el plato.
								</p>
								<FieldError errors={[errors.categoryId]} />
							</Field>
						)}
					/>
				</FieldSet>

				<div className="grid gap-7 lg:grid-cols-2">
					<Controller
						control={control}
						name="ingredients"
						render={({ field }) => (
							<DynamicStringListField
								description="Hasta 50 elementos, sin duplicados."
								error={getErrorMessage(errors.ingredients)}
								id="dish-ingredients"
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
								id="dish-allergens"
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
						disabled={isSubmitting || createMutation.isPending}
						type="submit"
					>
						{createMutation.isPending ? "Creando…" : "Crear plato"}
					</Button>
				</div>
			</form>

			<AlertDialog open={draft !== null} onOpenChange={() => undefined}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Encontramos un borrador</AlertDialogTitle>
						<AlertDialogDescription>
							Puedes recuperar los datos guardados o descartarlos.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={discardDraft}>
							Descartar
						</AlertDialogCancel>
						<AlertDialogAction onClick={recoverDraft}>
							Recuperar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function getDefaultValues(
	categories: MenuCategory[],
	initialPosition: number,
): DishFormValues {
	return {
		name: "",
		description: "",
		imageUrl: "",
		ingredients: [],
		allergens: [],
		categoryId: categories[0]?.id ?? "",
		position: initialPosition,
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

function getDishCreateErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		if (error.code === "FORBIDDEN")
			return "No tienes permisos para crear platos.";
		if (error.code === "RESTAURANT_NOT_FOUND") {
			return "El restaurante no existe o no está disponible.";
		}
		if (error.code === "MENU_CATEGORY_NOT_FOUND") {
			return "La categoría seleccionada ya no existe.";
		}
		if (error.code === "NETWORK_ERROR" || error.status === 0) {
			return "No se pudo conectar con el servidor. Inténtalo nuevamente.";
		}
	}
	return "No se pudo crear el plato. Inténtalo nuevamente.";
}
