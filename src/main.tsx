import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/ui/toast'
import App from './App.tsx'
import './index.css'

// Instancia global de React Query — config sensata para una app realtime
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Realtime mantiene la caché fresca, así que evitamos refetchs ruidosos
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            retry: 1,
        },
        mutations: {
            retry: 0, // las mutaciones nunca se reintentan automáticamente
        },
    },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <ToastProvider>
                    <BrowserRouter>
                        <App />
                    </BrowserRouter>
                </ToastProvider>
            </AuthProvider>
        </QueryClientProvider>
    </React.StrictMode>
)