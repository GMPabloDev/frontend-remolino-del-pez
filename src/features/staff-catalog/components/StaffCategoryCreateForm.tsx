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
import {
	type CategoryFormValues,
	categoryFormSchema,
	toCreateMenuCategoryRequest,
} from "../contracts/staff-catalog-form.schemas";
import {
	readStaffCatalogDraft,
	removeStaffCatalogDraft,
	type StoredCatalogDraft,
	saveStaffCatalogDraft,
} from "../lib/staff-catalog-drafts";
import { useCreateMenuCategoryMutation } from "../query/staff-catalog-query";

interface StaffCategoryCreateFormProps {
	initialPosition: number;
	session: StaffSessionAccess;
	userId: string;
}

export function StaffCategoryCreateForm({
	initialPosition,
	session,
	userId,
}: StaffCategoryCreateFormProps) {
	const [draft, setDraft] = useState<StoredCatalogDraft<
		CategoryFormValues,
		null
	> | null>(null);
	const createMutation = useCreateMenuCategoryMutation(session);
	const {
		control,
		formState: { errors, isDirty, isSubmitting },
		handleSubmit,
		register,
		reset,
		setError,
		setFocus,
	} = useForm<CategoryFormValues>({
		defaultValues: { name: "", position: initialPosition },
		mode: "onSubmit",
		resolver: zodResolver(categoryFormSchema),
		shouldFocusError: false,
	});
	const values = useWatch({ control }) as CategoryFormValues;
	useStaffUnsavedChanges("category-new", isDirty);

	useEffect(() => {
		setDraft(
			readStaffCatalogDraft({
				userId,
				section: "category-new",
				valuesSchema: categoryFormSchema,
				baseSchema: z.null(),
			}),
		);
	}, [userId]);

	useEffect(() => {
		if (!isDirty) return;

		saveStaffCatalogDraft({
			userId,
			section: "category-new",
			base: null,
			values,
			valuesSchema: categoryFormSchema,
			baseSchema: z.null(),
		});
	}, [isDirty, userId, values]);

	async function handleValidSubmit(
		formValues: CategoryFormValues,
	): Promise<void> {
		try {
			const category = await createMutation.mutateAsync(
				toCreateMenuCategoryRequest(formValues),
			);
			removeStaffCatalogDraft(userId, "category-new");
			window.location.replace(
				`/staff/catalog/categories/${encodeURIComponent(category.id)}?created=1`,
			);
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

			toast.error(getCreateCategoryErrorMessage(error));
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
		removeStaffCatalogDraft(userId, "category-new");
		setDraft(null);
	}

	return (
		<>
			<form
				className="space-y-7"
				noValidate
				onSubmit={(event) => {
					void handleSubmit(handleValidSubmit, handleInvalidSubmit)(event);
				}}
			>
				<FieldSet>
					<FieldDescription>
						Registra una categoría para organizar los platos de la carta.
					</FieldDescription>
					<FieldGroup className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
						<Field data-invalid={Boolean(errors.name)}>
							<FieldLabel htmlFor="category-name">Nombre</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.name)}
								id="category-name"
								placeholder="Fondos"
								{...register("name")}
							/>
							<FieldError errors={[errors.name]} />
						</Field>
						<Field data-invalid={Boolean(errors.position)}>
							<FieldLabel htmlFor="category-position">Posición</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.position)}
								id="category-position"
								min={1}
								type="number"
								{...register("position", { valueAsNumber: true })}
							/>
							<FieldError errors={[errors.position]} />
						</Field>
					</FieldGroup>
				</FieldSet>
				<Button
					disabled={isSubmitting || createMutation.isPending}
					type="submit"
				>
					{createMutation.isPending ? "Creando…" : "Crear categoría"}
				</Button>
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

function getCreateCategoryErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		if (error.code === "FORBIDDEN") {
			return "No tienes permisos para crear categorías.";
		}

		if (error.code === "RESTAURANT_NOT_FOUND") {
			return "El restaurante no existe o no está disponible.";
		}

		if (error.code === "NETWORK_ERROR" || error.status === 0) {
			return "No se pudo conectar con el servidor. Inténtalo nuevamente.";
		}
	}

	return "No se pudo crear la categoría. Inténtalo nuevamente.";
}
