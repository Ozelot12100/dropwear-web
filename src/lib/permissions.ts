import type { UserRole } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Capacidades por rol (fuente única para la UI).
//
// IMPORTANTE: la seguridad real vive en el RLS/RPC de Supabase. Estas listas solo
// deciden qué botones se MUESTRAN, y por eso deben coincidir (o ser más estrictas)
// que las políticas de la base de datos, nunca más permisivas.
//
//   Política RLS items_update → vendedor, repartidor, socio, superadmin
//   Política RLS items_insert → vendedor, socio, superadmin
//   Catálogo / borrado        → socio, superadmin
//   contador                  → solo lectura (ninguna escritura)
// ─────────────────────────────────────────────────────────────────────────────

// Cambiar el estado de una prenda: vender / apartar / devolver / regresar a stock.
// Coincide con la política RLS items_update (excluye a 'contador').
export const STATUS_CHANGE_ROLES: UserRole[] = ['vendedor', 'repartidor', 'socio', 'superadmin'];

// Corregir los detalles físicos de una prenda (producto / talla / color).
// Excluye 'contador' (lectura) y 'repartidor' (su rol son entregas, no catalogar).
export const ITEM_EDIT_ROLES: UserRole[] = ['vendedor', 'socio', 'superadmin'];

// Administrar catálogo, altas de inventario, gastos, corte y precios.
export const CATALOG_ROLES: UserRole[] = ['socio', 'superadmin'];

// Helper: ¿el rol dado pertenece al conjunto permitido?
export const can = (role: UserRole | null | undefined, roles: UserRole[]): boolean =>
    !!role && roles.includes(role);
