import { z } from "zod";

export const staffRoleSchema = z.enum(["admin", "manager", "branch_admin"]);
export const staffStatusSchema = z.enum(["active", "inactive"]);

const isoDateTimeSchema = z.iso.datetime({ offset: true });
const passwordSchema = z
	.string()
	.min(10)
	.max(128)
	.regex(/[A-Z]/, "Debe contener al menos una mayúscula.")
	.regex(/[a-z]/, "Debe contener al menos una minúscula.")
	.regex(/\d/, "Debe contener al menos un número.");

export const staffUserSchema = z.object({
	id: z.uuid(),
	fullName: z.string().trim().min(1).max(150),
	email: z.email(),
	phone: z.string().nullable(),
	role: staffRoleSchema,
	status: staffStatusSchema,
	branchId: z.uuid().nullable(),
	createdAt: isoDateTimeSchema,
	updatedAt: isoDateTimeSchema,
});

export const loginRequestSchema = z.object({
	email: z.string().trim().toLowerCase().pipe(z.email()),
	password: z.string().min(1).max(128),
});

export const backendAuthResponseSchema = z.object({
	accessToken: z.string().min(1),
	refreshToken: z.string().min(1),
	user: staffUserSchema,
});

export const staffSessionResponseSchema = z.object({
	accessToken: z.string().min(1),
	user: staffUserSchema,
});

export const refreshTokenSchema = z.string().min(1);

export const changePasswordRequestSchema = z.object({
	currentPassword: z.string().min(1).max(128),
	newPassword: passwordSchema,
});

export const changePasswordFormSchema = z
	.object({
		currentPassword: z.string().min(1).max(128),
		newPassword: passwordSchema,
		confirmNewPassword: z.string().min(1).max(128),
	})
	.refine((input) => input.newPassword === input.confirmNewPassword, {
		path: ["confirmNewPassword"],
		message: "Las contraseñas nuevas deben coincidir.",
	});

export type StaffRole = z.infer<typeof staffRoleSchema>;
export type StaffStatus = z.infer<typeof staffStatusSchema>;
export type StaffUser = z.infer<typeof staffUserSchema>;
export type LoginInput = z.infer<typeof loginRequestSchema>;
export type BackendAuthResponse = z.infer<typeof backendAuthResponseSchema>;
export type StaffSessionResponse = z.infer<typeof staffSessionResponseSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordFormSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;
