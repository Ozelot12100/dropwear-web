import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks';
import { cashCutService } from '../services/cashcut';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Banknote, ArrowRightLeft, CreditCard, Wallet, Save, Scale } from 'lucide-react';

const WRITE_ROLES = ['socio', 'superadmin'];
const capsHead = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';
const errorBox = 'rounded-lg border border-status-returned/30 bg-status-returned/10 p-2.5 text-sm text-status-returned';
const money = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fmtDate = (s: string) => { const [y = 0, m = 1, d = 1] = s.split('-').map(Number); return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(y, m - 1, d)); };

export default function CashCutPage() {
    const qc = useQueryClient();
    const { profile } = useAuth();
    const canWrite = profile?.role ? WRITE_ROLES.includes(profile.role) : false;

    const [date, setDate] = useState(todayISO());
    const [openingFloat, setOpeningFloat] = useState('');
    const [cashOut, setCashOut] = useState('');
    const [countedCash, setCountedCash] = useState('');
    const [notes, setNotes] = useState('');
    const [err, setErr] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const { data: sales, isLoading: loadingSales } = useQuery({
        queryKey: ['daySales', date],
        queryFn: () => cashCutService.getDaySales(date),
    });
    const { data: cuts } = useQuery({ queryKey: ['cashCuts'], queryFn: cashCutService.getCashCuts });

    const opening = parseFloat(openingFloat.replace(/,/g, '.')) || 0;
    const outflow = parseFloat(cashOut.replace(/,/g, '.')) || 0;
    const counted = parseFloat(countedCash.replace(/,/g, '.'));
    const salesCash = sales?.efectivo ?? 0;
    const expected = opening + salesCash - outflow;
    const difference = (isNaN(counted) ? 0 : counted) - expected;
    const hasCount = countedCash.trim() !== '' && !isNaN(counted) && counted >= 0;
    // Los montos de efectivo no pueden ser negativos (el atributo min="0" no basta
    // porque el guardado no pasa por un <form>, así que validamos en JS).
    const negativeInputs = opening < 0 || outflow < 0;

    const methodTiles = [
        { key: 'efectivo', label: 'Efectivo', value: sales?.efectivo, icon: Banknote, cls: 'text-status-available', bar: 'bg-status-available' },
        { key: 'transferencia', label: 'Transferencia', value: sales?.transferencia, icon: ArrowRightLeft, cls: 'text-ink', bar: 'bg-ink' },
        { key: 'tarjeta', label: 'Tarjeta', value: sales?.tarjeta, icon: CreditCard, cls: 'text-status-reserved', bar: 'bg-status-reserved' },
    ];

    const save = useMutation({
        mutationFn: () => cashCutService.createCashCut({
            cut_date: date,
            opening_float: opening,
            sales_cash: salesCash,
            cash_out: outflow,
            expected_cash: expected,
            counted_cash: counted,
            difference,
            notes: notes || null,
        }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['cashCuts'] });
            setSaved(true);
            setOpeningFloat(''); setCashOut(''); setCountedCash(''); setNotes('');
        },
        onError: (e: Error) => setErr(e.message),
    });

    const diffLabel = useMemo(() => {
        if (!hasCount) return { text: '—', cls: 'text-muted-foreground' };
        if (Math.abs(difference) < 0.005) return { text: 'Cuadra exacto ✓', cls: 'text-status-available' };
        if (difference > 0) return { text: `Sobrante ${money(difference)}`, cls: 'text-status-reserved' };
        return { text: `Faltante ${money(Math.abs(difference))}`, cls: 'text-status-returned' };
    }, [hasCount, difference]);

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-[32px]">Corte de Caja</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Cuadra el efectivo del cajón contra las ventas del sistema.</p>
                </div>
                <div className="grid gap-1.5">
                    <Label className={capsHead}>Fecha del corte</Label>
                    <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setSaved(false); }} max={todayISO()} className="h-11 w-full md:w-48" />
                </div>
            </div>

            {/* Ventas del día por método */}
            <div className="grid grid-cols-3 gap-3">
                {methodTiles.map(({ key, label, value, icon: Icon, cls, bar }) => (
                    <div key={key} className="relative flex h-24 flex-col justify-between overflow-hidden rounded-xl border border-hairline bg-card p-3 shadow-soft md:h-28 md:p-4">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${bar}`} />
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
                            <Icon className="h-4 w-4" />
                        </div>
                        {loadingSales ? <Skeleton className="h-6 w-16" /> : <div className={`font-mono text-[15px] font-semibold md:text-[18px] ${cls}`}>{money(value ?? 0)}</div>}
                    </div>
                ))}
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
                {loadingSales ? 'Cargando ventas…' : `${sales?.count ?? 0} venta${(sales?.count ?? 0) === 1 ? '' : 's'} · total ${money(sales?.total ?? 0)}`}
            </p>

            {/* Arqueo */}
            <div className="rounded-xl border border-hairline bg-card p-5 shadow-soft">
                <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-ink"><Scale className="h-5 w-5" />Arqueo de efectivo</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div className="grid gap-1.5">
                        <Label className={capsHead}>Fondo inicial</Label>
                        <Input type="number" inputMode="decimal" step="0.01" min="0" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} placeholder="0.00" className="h-11 font-mono" disabled={!canWrite} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className={capsHead}>Salidas de efectivo</Label>
                        <Input type="number" inputMode="decimal" step="0.01" min="0" value={cashOut} onChange={(e) => setCashOut(e.target.value)} placeholder="0.00" className="h-11 font-mono" disabled={!canWrite} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className={capsHead}>Efectivo contado *</Label>
                        <Input type="number" inputMode="decimal" step="0.01" min="0" value={countedCash} onChange={(e) => setCountedCash(e.target.value)} placeholder="0.00" className="h-11 font-mono" disabled={!canWrite} />
                    </div>
                </div>

                {/* Desglose del cálculo */}
                <div className="mt-4 space-y-1.5 rounded-lg border border-hairline bg-secondary/40 p-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Fondo inicial</span><span className="font-mono text-ink">{money(opening)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">+ Ventas en efectivo</span><span className="font-mono text-ink">{money(salesCash)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">− Salidas de efectivo</span><span className="font-mono text-ink">{money(outflow)}</span></div>
                    <div className="flex justify-between border-t border-hairline pt-1.5 font-semibold"><span className="text-ink">= Efectivo esperado</span><span className="font-mono text-ink">{money(expected)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Efectivo contado</span><span className="font-mono text-ink">{hasCount ? money(counted) : '—'}</span></div>
                    <div className="flex items-center justify-between border-t border-hairline pt-1.5"><span className="font-semibold text-ink">Diferencia</span><span className={`font-mono font-semibold ${diffLabel.cls}`}>{diffLabel.text}</span></div>
                </div>

                {canWrite && (
                    <div className="mt-4 grid gap-1.5">
                        <Label className={capsHead}>Nota (opcional)</Label>
                        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ej. corte turno tarde" maxLength={200} className="h-11" />
                    </div>
                )}

                {negativeInputs && <p className={`mt-3 ${errorBox}`}>Los montos de efectivo no pueden ser negativos.</p>}
                {err && <p className={`mt-3 ${errorBox}`}>{err}</p>}
                {saved && <p className="mt-3 rounded-lg border border-status-available/30 bg-status-available/10 p-2.5 text-sm text-status-available">Corte guardado ✓</p>}

                {canWrite && (
                    <div className="mt-4 flex justify-end">
                        <Button className="gap-2" onClick={() => { setErr(null); setSaved(false); save.mutate(); }} disabled={!hasCount || negativeInputs || save.isPending}>
                            <Save className="h-4 w-4" />{save.isPending ? 'Guardando…' : 'Guardar corte'}
                        </Button>
                    </div>
                )}
                {!canWrite && <p className="mt-3 text-xs text-muted-foreground">Tu rol puede consultar el corte pero no guardarlo.</p>}
            </div>

            {/* Historial */}
            <section className="space-y-3">
                <h2 className="font-heading text-lg font-semibold text-ink">Cortes anteriores</h2>
                <div className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-card">
                    {(cuts ?? []).map((c) => {
                        const diff = Number(c.difference);
                        const cls = Math.abs(diff) < 0.005 ? 'text-status-available' : diff > 0 ? 'text-status-reserved' : 'text-status-returned';
                        return (
                            <div key={c.id} className="flex items-center justify-between gap-3 p-3.5">
                                <div className="min-w-0">
                                    <p className="flex items-center gap-2 text-sm font-medium text-ink"><Wallet className="h-4 w-4 text-muted-foreground" />{fmtDate(c.cut_date)}</p>
                                    <p className="text-xs text-muted-foreground">Esperado {money(Number(c.expected_cash))} · contado {money(Number(c.counted_cash))}{c.user_profiles?.full_name ? ` · ${c.user_profiles.full_name}` : ''}</p>
                                </div>
                                <span className={`shrink-0 font-mono text-sm font-semibold ${cls}`}>
                                    {Math.abs(diff) < 0.005 ? 'Cuadra' : (diff > 0 ? '+' : '−') + money(Math.abs(diff)).replace('-', '')}
                                </span>
                            </div>
                        );
                    })}
                    {(cuts?.length ?? 0) === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay cortes guardados.</p>}
                </div>
            </section>
        </div>
    );
}
