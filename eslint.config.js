import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Las Edge Functions viven en el runtime Deno (tipos/globals propios); no las
  // lintea el config del frontend.
  globalIgnores(['dist', 'supabase']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Regla de HMR (solo experiencia de desarrollo, no correctitud). shadcn/ui
      // exporta variantes cva junto al componente; se deja como aviso.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Regla nueva y agresiva: marca patrones legítimos (sync de formulario al abrir,
      // carga inicial). Se deja como aviso; el refactor de fondo (StaffPage → useQuery)
      // es el hallazgo H6 del informe.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
