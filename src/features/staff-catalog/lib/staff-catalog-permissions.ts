import type {
	StaffRole,
	StaffUser,
} from "@/features/staff-auth/contracts/staff-auth.schemas";

export function canManageStaffCatalog(role: StaffRole): boolean {
	return role === "admin" || role === "manager";
}

export function canCreateStaffCatalog(role: StaffRole): boolean {
	return canManageStaffCatalog(role);
}

export function canViewStaffCatalog(_role: StaffRole): boolean {
	return true;
}

export function canConfigureBranchMenu(
	user: Pick<StaffUser, "role" | "branchId">,
	branchId: string,
): boolean {
	if (canManageStaffCatalog(user.role)) return true;

	return user.role === "branch_admin" && user.branchId === branchId;
}

export function canEditGlobalCatalog(role: StaffRole): boolean {
	return canManageStaffCatalog(role);
}
