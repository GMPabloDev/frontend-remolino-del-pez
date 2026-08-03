import type {
	StaffRole,
	StaffUser,
} from "@/features/staff-auth/contracts/staff-auth.schemas";

export function canCreateStaffBranch(role: StaffRole): boolean {
	return role === "admin" || role === "manager";
}

export function canViewStaffBranch(
	user: Pick<StaffUser, "role" | "branchId">,
	branchId: string,
): boolean {
	return canManageStaffBranch(user, branchId);
}

export function canManageStaffBranch(
	user: Pick<StaffUser, "role" | "branchId">,
	branchId: string,
): boolean {
	if (user.role === "admin" || user.role === "manager") return true;

	return user.role === "branch_admin" && user.branchId === branchId;
}
