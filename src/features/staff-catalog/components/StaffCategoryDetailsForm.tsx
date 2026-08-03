import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { type FieldErrors, useForm, useWatch } from "react-hook-form";
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
	type CategoryFormValues,
	categoryFormSchema,
	toUpdateMenuCategoryRequest,
} from "../contracts/staff-catalog-form.schemas";
import {
	hasCatalogUpdatedAtConflict,
	readStaffCatalogDraft,
	removeStaffCatalogDraft,
	type StoredCatalogDraft,
	saveStaffCatalogDraft,
} from "../lib/staff-catalog-drafts";
import { useUpdateMenuCategoryMutation } from "../query/staff-catalog-query";
import { CatalogStatusBadge } from "./CatalogStatusBadge";

interface StaffCategoryDetailsFormProps {
	category: MenuCategory;
	session: StaffSessionAccess;
	userId: string;
}

export function StaffCategoryDetailsForm({
	category,
	session,
	userId,
}: StaffCategoryDetailsFormProps) {
	const [draft, setDraft] = useState<StoredCatalogDraft<
		CategoryFormValues,
		string
	> | null>(null);
	const updateMutation = useUpdateMenuCategoryMutation(session);
	const {
		control,
		formState: { errors, isDirty, isSubmitting },
		handleSubmit,
		register,
		reset,
		setError,
		setFocus,
	} = useForm<CategoryFormValues>({
		defaultValues: getDefaultValues(category),
		mode: "onSubmit",
		resolver: zodResolver(categoryFormSchema),
		shouldFocusError: false,
	});
	const values = useWatch({ control }) as CategoryFormValues;
	const hasDraftConflict = draft
		? hasCatalogUpdatedAtConflict(draft.base, category.updatedAt)
		: false;
	useStaffUnsavedChanges("category-details", isDirty);

	useEffect(() => {
		reset(getDefaultValues(category));
	}, [category, reset]);

	useEffect(() => {
		setDraft(
			readStaffCatalogDraft({
				userId,
				section: "category-details",
				resourceId: category.id,
				valuesSchema: categoryFormSchema,
				baseSchema: z.string(),
			}),
		);
	}, [category.id, userId]);

	useEffect(() => {
		if (!isDirty) return;

		saveStaffCatalogDraft({
			userId,
			section: "category-details",
			resourceId: category.id,
			base: category.updatedAt,
			values,
			valuesSchema: categoryFormSchema,
			baseSchema: z.string(),
		});
	}, [category.id, category.updatedAt, isDirty, userId, values]);

	async function handleValidSubmit(
		formValues: CategoryFormValues,
	): Promise<void> {
		try {
			const updatedCategory = await updateMutation.mutateAsync({
				categoryId: category.id,
				input: toUpdateMenuCategoryRequest(formValues),
			});
			removeStaffCatalogDraft(userId, "category-details", category.id);
			setDraft(null);
			reset(getDefaultValues(updatedCategory));
			toast.success("Los datos de la categoría fueron guardados.");
		} catch (error) {
			if (
				error instanceof ApiClientError &&
				error.code === "MENU_CATEGORY_NAME_ALREADY_EXISTS"
			) {
				setError("name", {
					message: "Este nombre ya está registrado en el restaurante.",
					type: "server",
				});
				setFocus("name");
				return;
			}

			toast.error(getUpdateCategoryErrorMessage(error));
		}
	}

	function handleInvalidSubmit(formErrors: FieldErrors<CategoryFormValues>) {
		if (formErrors.name) setFocus("name");
		else if (formErrors.position) setFocus("position");
	}

	function recoverDraft(): void {
		if (!draft) return;
		reset(draft.values, { keepDefaultValues: true });
		setDraft(null);
	}

	function discardDraft(): void {
		removeStaffCatalogDraft(userId, "category-details", category.id);
		setDraft(null);
	}

	return (
		<section className="rounded-3xl border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.08)] sm:p-8">
			<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e76832]">
						Datos de la categoría
					</p>
					<h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.05em]">
						Editar categoría
					</h2>
					<FieldDescription>
						Actualiza el nombre y la posición en un único guardado.
					</FieldDescription>
				</div>
				<CatalogStatusBadge status={category.status} />
			</div>

			<form
				className="space-y-7"
				noValidate
				onSubmit={(event) => {
					void handleSubmit(handleValidSubmit, handleInvalidSubmit)(event);
				}}
			>
				<FieldSet>
					<FieldGroup className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
						<Field data-invalid={Boolean(errors.name)}>
							<FieldLabel htmlFor="category-details-name">Nombre</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.name)}
								id="category-details-name"
								{...register("name")}
							/>
							<FieldError errors={[errors.name]} />
						</Field>
						<Field data-invalid={Boolean(errors.position)}>
							<FieldLabel htmlFor="category-details-position">
								Posición
							</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.position)}
								id="category-details-position"
								min={1}
								type="number"
								{...register("position", { valueAsNumber: true })}
							/>
							<FieldError errors={[errors.position]} />
						</Field>
					</FieldGroup>
				</FieldSet>
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
								? "La categoría cambió en el servidor desde que guardaste este borrador. ¿Quieres reemplazar esos cambios?"
								: "Hay datos de la categoría que no terminaste de guardar. Puedes recuperarlos o descartarlos."}
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

function getDefaultValues(category: MenuCategory): CategoryFormValues {
	return { name: category.name, position: category.position };
}

function getUpdateCategoryErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		if (error.code === "FORBIDDEN") {
			return "No tienes permisos para editar categorías.";
		}

		if (error.code === "MENU_CATEGORY_NOT_FOUND") {
			return "La categoría ya no existe o no está disponible.";
		}

		if (error.code === "NETWORK_ERROR" || error.status === 0) {
			return "No se pudo conectar con el servidor. Inténtalo nuevamente.";
		}
	}

	return "No se pudieron guardar los datos de la categoría.";
}
