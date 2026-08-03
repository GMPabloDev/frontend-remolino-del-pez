import type { ReactNode } from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

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
import {
	attachUnsavedChangesBeforeUnload,
	createUnsavedChangesGuard,
	type UnsavedChangesGuard,
} from "../lib/staff-unsaved-changes";

interface StaffUnsavedChangesContextValue {
	registerDirty(section: string, isDirty: boolean): void;
}

const StaffUnsavedChangesContext =
	createContext<StaffUnsavedChangesContextValue | null>(null);

export function StaffUnsavedChangesProvider({
	children,
}: {
	children: ReactNode;
}) {
	const guardReference = useRef<UnsavedChangesGuard | null>(null);
	const [dirtySections, setDirtySections] = useState<Set<string>>(
		() => new Set(),
	);
	const [pendingHref, setPendingHref] = useState<string | null>(null);

	if (!guardReference.current) {
		guardReference.current = createUnsavedChangesGuard();
	}

	const guard = guardReference.current;

	useEffect(() => {
		guard.setDirty(dirtySections.size > 0);
	}, [dirtySections, guard]);

	useEffect(() => {
		return attachUnsavedChangesBeforeUnload(guard, window);
	}, [guard]);

	useEffect(() => {
		function handleInternalLinkClick(event: MouseEvent): void {
			if (
				!guard.getSnapshot() ||
				event.defaultPrevented ||
				event.button !== 0 ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey
			) {
				return;
			}

			if (!(event.target instanceof Element)) return;

			const link = event.target.closest("a");
			if (!link || link.target === "_blank" || link.hasAttribute("download")) {
				return;
			}

			const href = link.getAttribute("href");
			if (!href || href.startsWith("#")) return;

			const destination = new URL(href, window.location.href);
			if (
				destination.origin !== window.location.origin ||
				destination.href === window.location.href
			) {
				return;
			}

			event.preventDefault();
			setPendingHref(destination.href);
		}

		document.addEventListener("click", handleInternalLinkClick, true);
		return () =>
			document.removeEventListener("click", handleInternalLinkClick, true);
	}, [guard]);

	const registerDirty = useCallback(
		(section: string, isDirty: boolean): void => {
			setDirtySections((currentSections) => {
				const alreadyDirty = currentSections.has(section);
				if (alreadyDirty === isDirty) return currentSections;

				const nextSections = new Set(currentSections);
				if (isDirty) nextSections.add(section);
				else nextSections.delete(section);
				return nextSections;
			});
		},
		[],
	);
	const contextValue = useMemo(() => ({ registerDirty }), [registerDirty]);

	function continueNavigation(): void {
		if (!pendingHref) return;

		const destination = pendingHref;
		setPendingHref(null);
		setDirtySections(new Set());
		guard.setDirty(false);
		window.location.assign(destination);
	}

	return (
		<StaffUnsavedChangesContext.Provider value={contextValue}>
			{children}
			<AlertDialog
				open={pendingHref !== null}
				onOpenChange={(open) => {
					if (!open) setPendingHref(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Hay cambios sin guardar</AlertDialogTitle>
						<AlertDialogDescription>
							Si sales ahora perderás los cambios que todavía no has guardado.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Seguir editando</AlertDialogCancel>
						<AlertDialogAction
							onClick={(event) => {
								event.preventDefault();
								continueNavigation();
							}}
						>
							Salir sin guardar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</StaffUnsavedChangesContext.Provider>
	);
}

export function useStaffUnsavedChanges(
	section: string,
	isDirty: boolean,
): void {
	const context = useContext(StaffUnsavedChangesContext);
	if (!context) {
		throw new Error(
			"useStaffUnsavedChanges debe usarse dentro de StaffUnsavedChangesProvider.",
		);
	}

	useEffect(() => {
		context.registerDirty(section, isDirty);
		return () => context.registerDirty(section, false);
	}, [context, isDirty, section]);
}
