import RegisterForm from '../components/forms/RegisterForm';
import BackButton from '../components/buttons/BackButton';

export default function RegisterPage() {
    return (
        <div className='relative flex justify-center items-center min-h-screen overflow-hidden' style={{ background: 'linear-gradient(135deg, #145C74 0%, #00BFFE 100%)' }}>
            {/* Decorative circles */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
            
            <BackButton />
            
            {/* Register card */}
            <div className="relative z-10 w-full max-w-2xl mx-4">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-bold mb-2" style={{ color: '#145C74' }}>Crear Cuenta</h1>
                        <p className="text-gray-600">Regístrate en la plataforma UTEC</p>
                    </div>
                    <RegisterForm />
                </div>
            </div>
        </div>
    )
}