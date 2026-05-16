import { defineConfig } from 'vite'
import react from '@vitejs/react-swc'
import tailwindcss from '@theme/vite' // Asegúrate de tener este import si usas @theme/vite

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})