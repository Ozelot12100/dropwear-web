import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
    id: string;
    title: string;
    description?: string;
    variant: ToastVariant;
    duration?: number;
}

interface ToastContextValue {
    toasts: ToastMessage[];
    push: (toast: Omit<ToastMessage, 'id'>) => string;
    dismiss: (id: string) => void;
    success: (title: string, description?: string) => string;
    error: (title: string, description?: string) => string;
    warning: (title: string, description?: string) => string;
    info: (title: string, description?: string) => string;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const variantStyles: Record<ToastVariant, { bar: string; icon: string; Icon: typeof CheckCircle2 }> = {
    success: { bar: 'bg-emerald-500',  icon: 'text-emerald-500', Icon: CheckCircle2 },
    error:   { bar: 'bg-rose-500',     icon: 'text-rose-500',    Icon: XCircle },
    warning: { bar: 'bg-amber-500',    icon: 'text-amber-500',   Icon: AlertTriangle },
    info:    { bar: 'bg-sky-500',      icon: 'text-sky-500',     Icon: Info },
};

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const dismiss = useCallback((id: string) => {
        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const push = useCallback((t: Omit<ToastMessage, 'id'>) => {
        const id = `t-${++toastCounter}-${Date.now()}`;
        const toast: ToastMessage = { id, duration: 4000, ...t };
        setToasts(prev => [...prev.slice(-4), toast]); // máx 5 simultáneos
        if (toast.duration && toast.duration > 0) {
            const timer = setTimeout(() => dismiss(id), toast.duration);
            timersRef.current.set(id, timer);
        }
        return id;
    }, [dismiss]);

    const helpers: Pick<ToastContextValue, 'success' | 'error' | 'warning' | 'info'> = {
        success: (title, description) => push({ title, description, variant: 'success' }),
        error:   (title, description) => push({ title, description, variant: 'error', duration: 5500 }),
        warning: (title, description) => push({ title, description, variant: 'warning' }),
        info:    (title, description) => push({ title, description, variant: 'info' }),
    };

    useEffect(() => {
        const ref = timersRef.current;
        return () => {
            ref.forEach(timer => clearTimeout(timer));
            ref.clear();
        };
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, push, dismiss, ...helpers }}>
            {children}
            <ToastViewport toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
    return (
        <div
            className="pointer-events-none fixed top-3 right-3 z-[100] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2 sm:top-4 sm:right-4"
            aria-live="polite"
            role="region"
        >
            {toasts.map(t => {
                const { bar, icon, Icon } = variantStyles[t.variant];
                return (
                    <div
                        key={t.id}
                        className={cn(
                            'pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-gray-200 bg-white p-3 pr-9 shadow-lg ring-1 ring-black/5',
                            'animate-in slide-in-from-right-4 fade-in duration-200'
                        )}
                    >
                        <span className={cn('absolute left-0 top-0 h-full w-1', bar)} aria-hidden />
                        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', icon)} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 leading-tight">{t.title}</p>
                            {t.description && (
                                <p className="mt-0.5 text-xs text-gray-600 leading-snug">{t.description}</p>
                            )}
                        </div>
                        <button
                            onClick={() => onDismiss(t.id)}
                            className="absolute top-2 right-2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                            aria-label="Cerrar notificación"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>.');
    return ctx;
}
