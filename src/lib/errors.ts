// Centralización de manejo de errores de Supabase / PostgreSQL.
// Convierte códigos crípticos en mensajes accionables en español.

export interface SupabaseLikeError {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
}

/**
 * Códigos de error de PostgreSQL relevantes para este dominio.
 * Referencia: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const PG_ERROR_MAP: Record<string, string> = {
    '23505': 'Ya existe un registro con esos datos. Revisa duplicados.',
    '23503': 'No se puede completar: hay registros relacionados que dependen de éste.',
    '23502': 'Falta un campo obligatorio.',
    '22P02': 'Formato de dato inválido.',
    '42501': 'No tienes permisos suficientes para esta operación.',
    'PGRST301': 'No tienes permisos suficientes (RLS).',
    'PGRST116': 'El registro ya no existe o fue modificado por otra persona.',
};

/**
 * Errores de aplicación lanzados desde nuestros services con `throw new Error('CODE:...')`.
 */
const APP_ERROR_MAP: Record<string, string> = {
    STALE_STATE: 'Esta prenda fue modificada por otro usuario hace instantes. Refresca y vuelve a intentarlo.',
    ITEM_NOT_FOUND: 'La prenda ya no existe en el inventario.',
    INVALID_PRICE: 'El precio cobrado debe ser mayor que cero.',
    INVALID_STATUS: 'El estado seleccionado no es válido.',
    NO_AUTH: 'Tu sesión expiró. Vuelve a iniciar sesión.',
};

export function parseError(err: unknown): string {
    if (!err) return 'Ocurrió un error desconocido.';

    // Errores nuestros con prefijo conocido
    if (err instanceof Error && err.message) {
        const tag = err.message.split(':')[0];
        if (APP_ERROR_MAP[tag]) return APP_ERROR_MAP[tag];
    }

    const e = err as SupabaseLikeError;

    // Código PostgREST / PostgreSQL
    if (e.code && PG_ERROR_MAP[e.code]) return PG_ERROR_MAP[e.code];

    // Heurística sobre el texto crudo de Supabase
    const raw = (e.message || (err instanceof Error ? err.message : '') || '').toLowerCase();
    if (raw.includes('foreign key')) return PG_ERROR_MAP['23503'];
    if (raw.includes('duplicate key') || raw.includes('unique constraint')) return PG_ERROR_MAP['23505'];
    if (raw.includes('row-level security')) return PG_ERROR_MAP['42501'];
    if (raw.includes('jwt') || raw.includes('not authenticated')) return APP_ERROR_MAP['NO_AUTH'];
    if (raw.includes('network') || raw.includes('failed to fetch')) {
        return 'Sin conexión. Verifica tu internet y reintenta.';
    }

    return e.message || 'Ocurrió un error inesperado.';
}
