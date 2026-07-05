import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initMonitoring } from './lib/monitoring'
import App from './App.tsx'
import './index.css'

// Registra handlers globales de errores no capturados (Sentry-ready)
initMonitoring();

// Instancia global de React Query. Defaults afinados para red lenta (móvil):
// evita refetches redundantes; los datos en vivo llegan por la suscripción Realtime.
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {/* 0. Red de seguridad: captura errores de render y evita pantalla en blanco */}
        <ErrorBoundary>
            {/* 1. Proveedor de Estado Servidor (Caché de catálogos) */}
            <QueryClientProvider client={queryClient}>
                {/* 2. Proveedor de Sesión y Rol de Supabase */}
                <AuthProvider>
                    {/* 3. Navegación SPA */}
                    <BrowserRouter>
                        <App />
                    </BrowserRouter>
                </AuthProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    </React.StrictMode>
)