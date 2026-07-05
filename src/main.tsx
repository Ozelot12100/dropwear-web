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

// Instancia global de React Query para caché de peticiones de tablas
const queryClient = new QueryClient();

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