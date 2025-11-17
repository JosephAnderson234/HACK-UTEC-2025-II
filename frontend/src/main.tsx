import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/index.css'
import AuthContextProvider from './context/AuthProvider.tsx'
import router from './router/routes.tsx'
import { RouterProvider } from 'react-router'
import { NotificationProvider } from './context/NotificationProvider';
import { WebSocketProvider } from './context/WebSocketProvider.tsx';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<AuthContextProvider>
			<NotificationProvider>
				<WebSocketProvider>
					<RouterProvider router={router} />
				</WebSocketProvider>
			</NotificationProvider>
		</AuthContextProvider>
	</StrictMode>,
)
