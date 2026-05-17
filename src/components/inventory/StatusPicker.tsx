import { cn } from '@/lib/utils';
import type { ItemStatus } from '../../types';

export interface StatusPickerOption {
    value: ItemStatus;
    label: string;
    emoji: string;
    ring: string;
    bg: string;
    text: string;
    description: string;
}

export const STATUS_OPTIONS: StatusPickerOption[] = [
    { value: 'disponible', label: 'Disponible', emoji: '🟢', description: 'Lista para venta', ring: 'ring-emerald-500',  bg: 'bg-emerald-50 border-emerald-300', text: 'text-emerald-700' },
    { value: 'apartado',   label: 'Apartado',   emoji: '🟡', description: 'Reservada al cliente', ring: 'ring-amber-500',    bg: 'bg-amber-50 border-amber-300',     text: 'text-amber-700' },
    { value: 'vendido',    label: 'Vendido',    emoji: '🔵', description: 'Cobrado y entregado',  ring: 'ring-indigo-500',   bg: 'bg-indigo-50 border-indigo-300',   text: 'text-indigo-700' },
    { value: 'devuelto',   label: 'Devuelto',   emoji: '🔴', description: 'Reingreso al stock',   ring: 'ring-rose-500',     bg: 'bg-rose-50 border-rose-300',       text: 'text-rose-700' },
];

interface Props {
    value: ItemStatus | '';
    onChange: (value: ItemStatus) => void;
    /** Estado actual de la prenda, para deshabilitar la misma opción */
    currentStatus?: ItemStatus;
    disabled?: boolean;
}

/**
 * Grid 2×2 de estados como tarjetas táctiles. Mucho más usable que un <select>
 * en pantallas chicas y deja claro visualmente el cambio que el usuario hará.
 */
export function StatusPicker({ value, onChange, currentStatus, disabled }: Props) {
    return (
        <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map(opt => {
                const isSelected = value === opt.value;
                const isCurrent = currentStatus === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        disabled={disabled || isCurrent}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            'relative flex flex-col items-start gap-0.5 rounded-xl border-2 p-3 text-left transition-all',
                            'disabled:cursor-not-allowed disabled:opacity-40',
                            isSelected
                                ? `${opt.bg} ${opt.text} shadow-sm`
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                        )}
                        aria-pressed={isSelected}
                    >
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                            <span className="text-base leading-none">{opt.emoji}</span>
                            {opt.label}
                        </span>
                        <span className={cn('text-[10px]', isSelected ? 'opacity-80' : 'text-gray-500')}>
                            {isCurrent ? 'Estado actual' : opt.description}
                        </span>
                        {isSelected && (
                            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-current animate-in zoom-in-50 duration-150" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
