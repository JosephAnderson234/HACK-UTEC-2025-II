import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/index.css'
import AuthContextProvider from './context/AuthProvider.tsx'
import router from './router/routes.tsx'
import { RouterProvider } from 'react-router'

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<AuthContextProvider>
			<RouterProvider router={router}/>
		</AuthContextProvider>
	</StrictMode>,
)
