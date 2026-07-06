import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
}

// Lock EN MEMORIA para el manejo del token de auth.
// Supabase, por defecto, usa `navigator.locks` para serializar getSession()/
// refresh del token. En algunos navegadores ese lock puede quedar "atascado"
// al recargar la página (deadlock conocido de gotrue): entonces getSession()
// nunca resuelve y la app se congela en "Verificando sesión...".
// Este lock serializa igual las operaciones dentro de la MISMA pestaña, pero
// vía una cadena de promesas en memoria, sin depender de navigator.locks
// (se pierde la coordinación entre pestañas, aceptable para esta app).
let authLockChain: Promise<unknown> = Promise.resolve();
function inMemoryLock<R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
    const result = authLockChain.then(fn, fn);
    // La cadena sigue viva aunque una operación falle (no rompemos el lock).
    authLockChain = result.then(
        () => undefined,
        () => undefined,
    );
    return result;
}

// Inyectamos nuestro tipo Database extraído del esquema DDL exacto
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        lock: inMemoryLock,
    },
});
