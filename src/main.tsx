import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import App from './App.tsx'
import './index.css'

// Instancia global de React Query para caché de peticiones de tablas
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
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
    </React.StrictMode>
)