import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks';
import {
    expenseService,
    EXPENSE_CATEGORIES,
    CATEGORY_LABELS,
    type ExpenseWithUser,
} from '../services/expenses';
import { downloadCsv } from '../lib/csv';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import {
    Plus, Pencil, Trash2, Download, ChevronLeft, ChevronRight, Receipt, User,
} from 'lucide-react';

// Roles con permiso de escritura (registrar/editar/borrar gastos).
const WRITE_ROLES = ['socio', 'superadmin'];

const capsHead = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';
const errorBox = 'rounded-lg border border-status-returned/30 bg-status-returned/10 p-2.5 text-sm text-status-returned';
const selectClass =
    'flex h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

// Fecha de hoy YYYY-MM-DD (local) para el default del formulario.
const todayISODate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Formatea 'YYYY-MM-DD' sin desfase de zona horaria (construye fecha local).
const formatDateOnly = (s: string) => {
    const [y = 0, m = 1, d = 1] = s.split('-').map(Number);
    return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' }).format(new Date(y, m - 1, d));
};

function CategoryPill({ category }: { category: string }) {
    return (
        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {CATEGORY_LABELS[category] ?? category}
        </span>
    );
}

export default function ExpensesPage() {
    const qc = useQueryClient();
    const { profile } = useAuth();
    const canWrite = profile?.role ? WRITE_ROLES.includes(profile.role) : false;

    // Mes en vista (primer día del mes). Arranca en el mes actual.
    const [viewDate, setViewDate] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    const monthLabelRaw = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(viewDate);
    const monthLabel = monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1);

    const goPrev = () => setViewDate(new Date(year, month - 1, 1));
    const goNext = () => { if (!isCurrentMonth) setViewDate(new Date(year, month + 1, 1)); };

    const { data: expenses, isLoading: loadingList } = useQuery({
        queryKey: ['expenses', year, month],
        queryFn: () => expenseService.getExpenses(year, month),
    });
    const { data: fin, isLoading: loadingFin } = useQuery({
        queryKey: ['expenseFinancials', year, month],
        queryFn: () => expenseService.getMonthlyFinancials(year, month),
    });

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ['expenses', year, month] });
        qc.invalidateQueries({ queryKey: ['expenseFinancials', year, month] });
    };

    // ── Formulario (crear / editar) ──────────────────────────────────────────
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<ExpenseWithUser | null>(null);
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [spentAt, setSpentAt] = useState('');
    const [description, setDescription] = useState('');
    const [err, setErr] = useState<string | null>(null);

    const openCreate = () => {
        setEditing(null); setAmount(''); setCategory(''); setSpentAt(todayISODate()); setDescription(''); setErr(null);
        setOpen(true);
    };
    const openEdit = (e: ExpenseWithUser) => {
        setEditing(e); setAmount(String(e.amount)); setCategory(e.category);
        setSpentAt(e.spent_at); setDescription(e.description ?? ''); setErr(null);
        setOpen(true);
    };

    const parsedAmount = parseFloat(amount.replace(/,/g, '.'));
    // El atributo max="hoy" del input no bloquea el guardado (no hay <form>); lo validamos aquí.
    const isFutureDate = !!spentAt && spentAt > todayISODate();
    const isValid = parsedAmount > 0 && !!category && !!spentAt && !isFutureDate;

    const save = useMutation({
        mutationFn: () => {
            const payload = { amount: parsedAmount, category, description: description || null, spent_at: spentAt };
            return editing ? expenseService.updateExpense(editing.id, payload) : expenseService.createExpense(payload);
        },
        onSuccess: () => { invalidate(); setOpen(false); },
        onError: (e: Error) => setErr(e.message),
    });

    // ── Borrado ──────────────────────────────────────────────────────────────
    const [toDelete, setToDelete] = useState<ExpenseWithUser | null>(null);
    const [delErr, setDelErr] = useState<string | null>(null);
    const del = useMutation({
        mutationFn: (id: number) => expenseService.deleteExpense(id),
        onSuccess: () => { invalidate(); setToDelete(null); },
        onError: (e: Error) => setDelErr(e.message),
    });

    // ── Exportar CSV ───────────────────────────────────────────────────────────
    const handleExport = () => {
        if (!expenses || expenses.length === 0) return;
        const headers = ['Fecha', 'Categoría', 'Descripción', 'Monto', 'Registró'];
        const rows = expenses.map((e) => [
            e.spent_at,
            CATEGORY_LABELS[e.category] ?? e.category,
            e.description ?? '',
            Number(e.amount).toFixed(2),
            e.user_profiles?.full_name ?? '',
        ]);
        downloadCsv(`dropwear-gastos-${year}-${String(month + 1).padStart(2, '0')}.csv`, headers, rows);
    };

    const total = useMemo(
        () => (expenses ?? []).reduce((a, e) => a + Number(e.amount), 0),
        [expenses],
    );

    // Tiles del resumen financiero del mes.
    const marginPct = fin && fin.revenue > 0 ? Math.round((fin.net / fin.revenue) * 100) : null;
    const summaryTiles: { key: string; label: string; value: number | undefined; valueClass: string; bar: string }[] = [
        { key: 'revenue', label: 'Ingresos', value: fin?.revenue, valueClass: 'text-status-available', bar: 'bg-status-available' },
        { key: 'cogs', label: 'Costo de venta', value: fin?.cogs, valueClass: 'text-ink', bar: 'bg-ink' },
        { key: 'expenses', label: 'Gastos', value: fin?.expenses, valueClass: 'text-status-returned', bar: 'bg-status-returned' },
    ];

    return (
        <div className="mx-auto max-w-5xl space-y-8">
            {/* Encabezado + selector de mes */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-[32px]">Control de Gastos</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Egresos operativos y utilidad neta real del negocio (ingresos − costo − gastos).
                    </p>
                </div>
                <div className="inline-flex items-center gap-1 self-start rounded-lg border border-hairline bg-card p-1">
                    <button
                        onClick={goPrev}
                        aria-label="Mes anterior"
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-ink active:scale-95"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="min-w-[9rem] text-center text-[13px] font-semibold uppercase tracking-wider text-ink">
                        {monthLabel}
                    </span>
                    <button
                        onClick={goNext}
                        disabled={isCurrentMonth}
                        aria-label="Mes siguiente"
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-ink active:scale-95 disabled:pointer-events-none disabled:opacity-30"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Resumen financiero: ingresos − costo − gastos = utilidad neta */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {summaryTiles.map(({ key, label, value, valueClass, bar }) => (
                    <div key={key} className="relative flex h-28 flex-col justify-between overflow-hidden rounded-xl border border-hairline bg-card p-4 shadow-soft md:h-32">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${bar}`} />
                        <span className={capsHead}>{label}</span>
                        {loadingFin ? (
                            <Skeleton className="h-7 w-24" />
                        ) : (
                            <div className={`font-mono text-[20px] leading-none md:text-[24px] ${valueClass}`}>
                                {key === 'revenue' ? '' : '−'}{formatCurrency(value ?? 0)}
                            </div>
                        )}
                    </div>
                ))}
                {/* Utilidad neta (tile destacado) */}
                <div className="relative flex h-28 flex-col justify-between overflow-hidden rounded-xl border-2 border-ink bg-ink p-4 shadow-soft md:h-32">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Utilidad Neta</span>
                    {loadingFin ? (
                        <Skeleton className="h-7 w-24 bg-white/20" />
                    ) : (
                        <div>
                            <div className={`font-mono text-[22px] font-semibold leading-none md:text-[26px] ${(fin?.net ?? 0) >= 0 ? 'text-status-available' : 'text-status-returned'}`}>
                                {formatCurrency(fin?.net ?? 0)}
                            </div>
                            {marginPct != null && (
                                <p className="mt-1.5 text-[11px] font-medium text-white/50">Margen neto {marginPct}%</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Barra de acciones */}
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                    {loadingList ? 'Cargando…' : `${expenses?.length ?? 0} gasto${(expenses?.length ?? 0) === 1 ? '' : 's'} · ${formatCurrency(total)}`}
                </p>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2" onClick={handleExport} disabled={!expenses || expenses.length === 0}>
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Exportar</span>
                    </Button>
                    {canWrite && (
                        <Button className="gap-2" onClick={openCreate}>
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">Registrar gasto</span>
                            <span className="sm:hidden">Gasto</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Lista — tarjetas en móvil */}
            <div className="space-y-3 md:hidden">
                {loadingList ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
                ) : expenses && expenses.length > 0 ? (
                    expenses.map((e) => (
                        <div key={e.id} className="rounded-xl border border-hairline bg-card p-4 shadow-soft">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <CategoryPill category={e.category} />
                                    <p className="mt-2 truncate text-sm font-medium text-ink">{e.description || 'Sin descripción'}</p>
                                    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{formatDateOnly(e.spent_at)}</span>
                                        {e.user_profiles?.full_name && (
                                            <><span>·</span><span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{e.user_profiles.full_name}</span></>
                                        )}
                                    </p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <div className="font-mono text-base font-semibold text-status-returned">−{formatCurrency(Number(e.amount))}</div>
                                    {canWrite && (
                                        <div className="mt-2 flex justify-end gap-1">
                                            <button onClick={() => openEdit(e)} aria-label="Editar" className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-ink active:scale-95">
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => { setDelErr(null); setToDelete(e); }} aria-label="Eliminar" className="rounded-full p-1.5 text-status-returned transition-colors hover:bg-status-returned/10 active:scale-95">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="rounded-xl border border-dashed border-hairline py-12 text-center">
                        <Receipt className="mx-auto h-8 w-8 text-muted-foreground/40" />
                        <p className="mt-3 text-sm text-muted-foreground">No hay gastos registrados en {monthLabel}.</p>
                    </div>
                )}
            </div>

            {/* Lista — tabla en desktop */}
            <div className="hidden overflow-hidden rounded-xl border border-hairline md:block">
                <Table>
                    <TableHeader>
                        <TableRow className="border-hairline hover:bg-transparent">
                            <TableHead className={capsHead}>Fecha</TableHead>
                            <TableHead className={capsHead}>Categoría</TableHead>
                            <TableHead className={capsHead}>Descripción</TableHead>
                            <TableHead className={capsHead}>Registró</TableHead>
                            <TableHead className={`text-right ${capsHead}`}>Monto</TableHead>
                            {canWrite && <TableHead className={`text-right ${capsHead}`}>Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loadingList && (
                            <TableRow><TableCell colSpan={canWrite ? 6 : 5} className="h-16 text-center text-muted-foreground">Cargando…</TableCell></TableRow>
                        )}
                        {expenses?.map((e) => (
                            <TableRow key={e.id} className="border-hairline hover:bg-secondary/60">
                                <TableCell className="font-mono text-muted-foreground">{formatDateOnly(e.spent_at)}</TableCell>
                                <TableCell><CategoryPill category={e.category} /></TableCell>
                                <TableCell className="max-w-xs truncate text-ink">{e.description || <span className="text-muted-foreground/60">—</span>}</TableCell>
                                <TableCell className="text-muted-foreground">{e.user_profiles?.full_name ?? '—'}</TableCell>
                                <TableCell className="text-right font-mono font-semibold text-status-returned">−{formatCurrency(Number(e.amount))}</TableCell>
                                {canWrite && (
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => openEdit(e)} aria-label="Editar" className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-ink active:scale-95">
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => { setDelErr(null); setToDelete(e); }} aria-label="Eliminar" className="rounded-full p-2 text-status-returned transition-colors hover:bg-status-returned/10 active:scale-95">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {!loadingList && expenses?.length === 0 && (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={canWrite ? 6 : 5} className="h-24 text-center text-muted-foreground">
                                    No hay gastos registrados en {monthLabel}.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Modal crear / editar */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>{editing ? 'Editar gasto' : 'Registrar gasto'}</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1.5">
                                <Label className={capsHead}>Monto (MXN) *</Label>
                                <Input
                                    type="number" inputMode="decimal" step="0.01" min="0"
                                    value={amount} onChange={(e) => setAmount(e.target.value)}
                                    placeholder="ej. 350.00" className="h-11 font-mono"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label className={capsHead}>Fecha *</Label>
                                <Input type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)} max={todayISODate()} className="h-11" />
                                {isFutureDate && <p className="text-xs font-medium text-status-returned">No puede ser una fecha futura.</p>}
                            </div>
                        </div>
                        <div className="grid gap-1.5">
                            <Label className={capsHead}>Categoría *</Label>
                            <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                                <option value="" disabled>Seleccionar…</option>
                                {EXPENSE_CATEGORIES.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label} — {c.hint}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label className={capsHead}>Descripción (opcional)</Label>
                            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ej. Envío DHL pedido #124" maxLength={200} className="h-11" />
                        </div>
                        {err && <p className={errorBox}>{err}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button onClick={() => save.mutate()} disabled={!isValid || save.isPending}>
                            {save.isPending ? 'Guardando…' : 'Guardar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!toDelete}
                title="Eliminar gasto"
                description={`¿Eliminar este gasto de ${toDelete ? formatCurrency(Number(toDelete.amount)) : ''}? Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar"
                isPending={del.isPending}
                error={delErr}
                onConfirm={() => toDelete && del.mutate(toDelete.id)}
                onOpenChange={(o) => { if (!o) { setToDelete(null); setDelErr(null); } }}
            />
        </div>
    );
}
