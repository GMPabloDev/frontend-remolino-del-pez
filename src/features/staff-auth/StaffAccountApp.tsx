import { StaffLayout } from "../staff-shell/components/StaffLayout";
import { ChangePasswordForm } from "./components/ChangePasswordForm";
import { ProtectedStaffRoute } from "./components/ProtectedStaffRoute";
import {
	StaffAuthProvider,
	useStaffAuth,
} from "./components/StaffAuthProvider";
import { StaffQueryProvider } from "./query/staff-query-client";

export function StaffAccountApp() {
	return (
		<StaffQueryProvider>
			<StaffAuthProvider>
				<StaffAccountScreen />
			</StaffAuthProvider>
		</StaffQueryProvider>
	);
}

function StaffAccountScreen() {
	const { session } = useStaffAuth();

	async function handlePasswordChanged() {
		await session.logout();
		window.location.replace("/staff/login?reason=password-changed");
	}

	return (
		<ProtectedStaffRoute>
			<StaffLayout eyebrow="Cuenta staff" title="Mi cuenta">
				<section className="max-w-2xl rounded-3xl border border-[#12324a]/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(18,50,74,0.08)] sm:p-8">
					<div className="mb-8 space-y-3">
						<h2 className="font-heading text-2xl font-semibold tracking-[-0.04em]">
							Cambiar contraseña
						</h2>
						<p className="text-sm leading-6 text-[#12324a]/65">
							Al guardar una nueva contraseña se cerrarán todas tus sesiones y
							tendrás que iniciar sesión nuevamente.
						</p>
					</div>
					<ChangePasswordForm onPasswordChanged={handlePasswordChanged} />
				</section>
			</StaffLayout>
		</ProtectedStaffRoute>
	);
}
