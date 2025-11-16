import type { AuthRegisterRequest } from "@/interfaces/context/AuthContext";
import { useForm } from "react-hook-form"
import LogoUtec from "@/assets/UTEC-Logo.jpg";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import { useSearchParams } from "react-router-dom";

export default function LoginForm() {

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AuthRegisterRequest>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useAuth();
    const onSubmit = async (data: AuthRegisterRequest) => {

        await login(data);
        const redirectTo = searchParams.get('from') || '/dashboard';
        navigate(redirectTo);
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 w-full max-w-sm">
            <div>
                <img src={LogoUtec} alt="UTEC Logo" className="w-32 mx-auto mb-4 rounded-2xl" />
            </div>
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-(--color-tertiary)">Email</label>
                <input
                    id="email"
                    type="email"
                    {...register("email", { required: "Email is required" })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-(--color-secondary) focus:border-(--color-secondary)"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-(--color-tertiary)">Password</label>
                <input

                    id="password"
                    type="password"
                    {...register("password", { required: "Password is required" })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-(--color-secondary) focus:border-(--color-secondary)"
                />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
            </div>
            <button
                type="submit"
                className="w-full bg-(--color-secondary) text-(--color-primary) py-2 px-4 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-(--color-secondary) disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isSubmitting}
            >
                {isSubmitting ? 'Iniciando...' : 'Login'}
            </button>
            <p className="text-sm text-center text-(--color-tertiary)">
                ¿No tienes cuenta? <Link to="/register" className="text-(--color-secondary) underline">Regístrate</Link>
            </p>
        </form>
    )
}