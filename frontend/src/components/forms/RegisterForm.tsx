import type { AuthRegisterRequest } from "@/interfaces/context/AuthContext";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import LogoUtec from "@/assets/UTEC-Logo.jpg";


export default function RegisterForm (){
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AuthRegisterRequest>();
    

    const onSubmit = async (data: AuthRegisterRequest) => {
        console.log(data);
        // Aquí deberías llamar a tu servicio de registro.
        // Por ejemplo: await authService.register(data)
        // Simulo ventana de espera y redirijo a login al finalizar
        await new Promise((res) => setTimeout(res, 700));
        //se realiza el registro aquí
    }
    return(
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 w-full max-w-sm">
            <div>
                <img src={LogoUtec} alt="UTEC Logo" className="w-32 mx-auto mb-4 rounded-2xl" />
            </div>
            <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-(--color-tertiary)">Nombres</label>
                <input
                    id="first_name"
                    type="text"
                    {...register("first_name")}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-(--color-secondary) focus:border-(--color-secondary)"
                />
                {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>}
            </div>

            <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-(--color-tertiary)">Apellidos</label>
                <input
                    id="last_name"
                    type="text"
                    {...register("last_name")}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-(--color-secondary) focus:border-(--color-secondary)"
                />
                {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name.message}</p>}
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
                    {...register("password", { required: "Password is required", minLength: { value: 6, message: 'La contraseña debe tener al menos 6 caracteres' } })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-(--color-secondary) focus:border-(--color-secondary)"
                />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
            </div>

            <div>
                <label htmlFor="DNI" className="block text-sm font-medium text-(--color-tertiary)">DNI (opcional)</label>
                <input
                    id="DNI"
                    type="text"
                    {...register("DNI")}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-(--color-secondary) focus:border-(--color-secondary)"
                />
                {errors.DNI && <p className="text-red-500 text-sm mt-1">{errors.DNI.message}</p>}
            </div>

            <div>
                <label htmlFor="cellphone" className="block text-sm font-medium text-(--color-tertiary)">Teléfono (opcional)</label>
                <input
                    id="cellphone"
                    type="tel"
                    {...register("cellphone")}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-(--color-secondary) focus:border-(--color-secondary)"
                />
                {errors.cellphone && <p className="text-red-500 text-sm mt-1">{errors.cellphone.message}</p>}
            </div>
            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-(--color-secondary) text-(--color-primary) py-2 px-4 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-(--color-secondary) disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {isSubmitting ? 'Registrando...' : 'Register'}
            </button>

            <p className="text-sm text-center text-(--color-tertiary)">
                ¿Ya tienes una cuenta? <Link to="/login" className="text-(--color-secondary) underline">Inicia sesión</Link>
            </p>
        </form>
    )
}