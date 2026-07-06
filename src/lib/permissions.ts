import type { UserRole, ItemStatus } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Capacidades por rol (fuente única para la UI).
//
// IMPORTANTE: la seguridad real la hace cumplir la base de datos (RLS + las RPC
// SECURITY DEFINER change_item_status / update_item_details / add_inventory_item,
// ver migración 20260706300000_inventory_role_matrix). Estas funciones solo
// deciden qué se MUESTRA, y espejan esas reglas para no ofrecer acciones que el
// backend rechazaría.
//
// Matriz de inventario:
//   superadmin, socio : todo (agregar, editar, cualquier cambio de estado).
//   vendedor          : agregar, editar detalles y cualquier cambio de estado. No borra.
//   repartidor        : SOLO entrega de apartado (apartado -> vendido).
//   contador          : solo lectura.
// ─────────────────────────────────────────────────────────────────────────────

// Corregir detalles de una prenda (producto/talla/color).
export const ITEM_EDIT_ROLES: UserRole[] = ['vendedor', 'socio', 'superadmin'];

// Agregar prendas nuevas al inventario.
export const ADD_ITEM_ROLES: UserRole[] = ['vendedor', 'socio', 'superadmin'];

// Acciones masivas (remate / regreso a stock): implican transiciones arbitrarias,
// así que se limitan a quienes pueden hacer cualquier cambio de estado.
export const BULK_STATUS_ROLES: UserRole[] = ['vendedor', 'socio', 'superadmin'];

// Administrar catálogo, gastos, corte y precios.
export const CATALOG_ROLES: UserRole[] = ['socio', 'superadmin'];

// Helper: ¿el rol dado pertenece al conjunto permitido?
export const can = (role: UserRole | null | undefined, roles: UserRole[]): boolean =>
    !!role && roles.includes(role);

const ALL_STATUSES: ItemStatus[] = ['disponible', 'apartado', 'vendido', 'devuelto'];

// ¿El rol puede llevar una prenda de `from` a `to`?
// Espeja exactamente la lógica del backend en change_item_status.
export const isStatusTransitionAllowed = (
    role: UserRole | null | undefined,
    from: string,
    to: ItemStatus,
): boolean => {
    if (!role || from === to) return false;
    switch (role) {
        case 'superadmin':
        case 'socio':
        case 'vendedor':
            return true;
        case 'repartidor':
            // Solo registrar la entrega de un apartado.
            return from === 'apartado' && to === 'vendido';
        default: // contador u otro
            return false;
    }
};

// ¿El rol puede hacer ALGÚN cambio de estado sobre una prenda en `from`?
// Sirve para decidir si el modal de transacción es de solo lectura.
export const canChangeStatusOf = (role: UserRole | null | undefined, from: string): boolean =>
    ALL_STATUSES.some((to) => isStatusTransitionAllowed(role, from, to));
