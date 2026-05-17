// Utilidades de validación pura (sin React) para reusar entre formularios.

import type { ItemStatus } from '../types';

const VALID_STATUSES: ItemStatus[] = ['disponible', 'apartado', 'vendido', 'devuelto'];
const VALID_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ÚNICA'];

export interface ValidationResult {
    ok: boolean;
    error?: string;
}

const ok: ValidationResult = { ok: true };
const fail = (error: string): ValidationResult => ({ ok: false, error });

export const validators = {
    required(value: unknown, field = 'Este campo'): ValidationResult {
        if (value === null || value === undefined) return fail(`${field} es obligatorio.`);
        if (typeof value === 'string' && !value.trim()) return fail(`${field} es obligatorio.`);
        return ok;
    },

    name(value: string, field = 'El nombre'): ValidationResult {
        const v = value?.trim() ?? '';
        if (!v) return fail(`${field} es obligatorio.`);
        if (v.length < 2) return fail(`${field} debe tener al menos 2 caracteres.`);
        if (v.length > 100) return fail(`${field} no puede superar 100 caracteres.`);
        return ok;
    },

    color(value: string): ValidationResult {
        const v = value?.trim() ?? '';
        if (!v) return fail('Indica el color de la prenda.');
        if (v.length < 2) return fail('El color es demasiado corto.');
        if (v.length > 30) return fail('El color no puede superar 30 caracteres.');
        if (!/^[\p{L}\s\-]+$/u.test(v)) return fail('El color solo admite letras, espacios y guiones.');
        return ok;
    },

    size(value: string): ValidationResult {
        if (!value) return fail('Selecciona una talla.');
        if (!VALID_SIZES.includes(value)) return fail('Talla no válida.');
        return ok;
    },

    price(value: string | number, opts?: { min?: number; max?: number }): ValidationResult {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (Number.isNaN(num)) return fail('El precio debe ser un número.');
        if (num <= 0) return fail('El precio debe ser mayor que cero.');
        if (opts?.min !== undefined && num < opts.min) return fail(`El precio mínimo es $${opts.min}.`);
        if (opts?.max !== undefined && num > opts.max) return fail(`El precio máximo es $${opts.max}.`);
        if (num > 999999) return fail('El precio es demasiado alto.');
        return ok;
    },

    status(value: string): ValidationResult {
        if (!value) return fail('Selecciona un estatus.');
        if (!VALID_STATUSES.includes(value as ItemStatus)) return fail('Estatus no válido.');
        return ok;
    },

    id(value: string | number, field = 'el registro'): ValidationResult {
        const num = typeof value === 'string' ? Number(value) : value;
        if (!num || Number.isNaN(num) || num <= 0) return fail(`Selecciona ${field}.`);
        return ok;
    },
};

/**
 * Normaliza un texto para guardarlo de manera consistente en BD.
 */
export const normalize = {
    name: (v: string) => v.trim(),
    size: (v: string) => v.trim().toUpperCase(),
    color: (v: string) => v.trim().toLowerCase(),
};

export { VALID_SIZES, VALID_STATUSES };
