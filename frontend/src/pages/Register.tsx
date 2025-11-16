import RegisterForm from '../components/forms/RegisterForm';
export default function RegisterPage (){
    return(
        <div className='flex justify-center items-center min-h-screen' style={{ backgroundColor: 'var(--color-primary)' }}>
            <div className="w-full max-w-md p-6">
                <RegisterForm />
            </div>
        </div>
    )
}