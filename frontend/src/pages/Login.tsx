import LoginForm from '../components/forms/LoginForm';
import BackButton from '../components/buttons/BackButton';
export default function LoginPage (){
    return(
        <div className='flex justify-center items-center min-h-screen' style={{ backgroundColor: 'var(--color-primary)' }}>
            <BackButton />
            <div className="w-full max-w-md p-6">
                <LoginForm />
            </div>
        </div>
    )
}