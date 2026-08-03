import type {
	StaffRole,
	StaffUser,
} from "@/features/staff-auth/contracts/staff-auth.schemas";

export function canCreateStaffTable(role: StaffRole): boolean {
	return role === "admin" || role === "manager";
}

export function canViewStaffTable(
	user: Pick<StaffUser, "role" | "branchId">,
	branchId: string,
): boolean {
	return canManageStaffTable(user, branchId);
}

export function canManageStaffTable(
	user: Pick<StaffUser, "role" | "branchId">,
	branchId: string,
): boolean {
	if (user.role === "admin" || user.role === "manager") return true;

	return user.role === "branch_admin" && user.branchId === branchId;
}
