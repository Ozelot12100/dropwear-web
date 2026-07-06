import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogService } from '../services/catalogs';
import type { Brand, Category } from '../types';
import type { ProductWithRelations } from '../services/catalogs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Pencil, Trash2, Plus, Upload, Loader2, Image as ImageIcon } from 'lucide-react';

// ── Estilos compartidos (diseño Stitch) ───────────────────────────────────────
const selectClass =
    'flex h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';
const errorBox = 'rounded-lg border border-status-returned/30 bg-status-returned/10 p-2.5 text-sm text-status-returned';
const capsHead = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

const formatCurrency = (amount: number | null | undefined) =>
    amount == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

// Margen % esperado a partir del precio de lista y el costo.
const productMargin = (base: number | null | undefined, cost: number | null | undefined): number | null => {
    if (cost == null || base == null || base <= 0) return null;
    return ((base - cost) / base) * 100;
};

function parseFKError(msg: string): string {
    if (msg.includes('foreign key constraint')) return 'No se puede eliminar: hay registros asociados en uso.';
    if (msg.includes('unique')) return 'Ya existe un registro con ese nombre.';
    return msg;
}

// Botones de acción (editar / eliminar) reutilizables
function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
    return (
        <div className="flex justify-end gap-1">
            <button
                onClick={onEdit}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-ink active:scale-95"
                aria-label="Editar"
            >
                <Pencil className="h-4 w-4" />
            </button>
            <button
                onClick={onDelete}
                className="rounded-full p-2 text-status-returned transition-colors hover:bg-status-returned/10 active:scale-95"
                aria-label="Eliminar"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}

// ── MARCAS ───────────────────────────────────────────────────────────────────
function BrandsTab() {
    const qc = useQueryClient();
    const [editing, setEditing] = useState<Brand | null>(null);
    const [name, setName] = useState('');
    const [open, setOpen] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [toDelete, setToDelete] = useState<Brand | null>(null);
    const [delErr, setDelErr] = useState<string | null>(null);

    const { data: brands, isLoading } = useQuery({ queryKey: ['brands'], queryFn: catalogService.getBrands });
    const save = useMutation({
        mutationFn: () => editing ? catalogService.updateBrand(editing.id, name) : catalogService.createBrand(name),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['brands'] }); setOpen(false); },
        onError: (e: Error) => setErr(parseFKError(e.message)),
    });
    const del = useMutation({
        mutationFn: (id: number) => catalogService.deleteBrand(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['brands'] }); setToDelete(null); },
        onError: (e: Error) => setDelErr(parseFKError(e.message)),
    });

    const openCreate = () => { setEditing(null); setName(''); setErr(null); setOpen(true); };
    const openEdit = (b: Brand) => { setEditing(b); setName(b.name); setErr(null); setOpen(true); };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" />Nueva Marca</Button>
            </div>
            <div className="overflow-hidden rounded-xl border border-hairline">
                <Table>
                    <TableHeader>
                        <TableRow className="border-hairline hover:bg-transparent">
                            <TableHead className={`w-16 ${capsHead}`}>ID</TableHead>
                            <TableHead className={capsHead}>Nombre</TableHead>
                            <TableHead className={`text-right ${capsHead}`}>Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && <TableRow><TableCell colSpan={3} className="h-16 text-center text-muted-foreground">Cargando...</TableCell></TableRow>}
                        {brands?.map(b => (
                            <TableRow key={b.id} className="border-hairline hover:bg-secondary/60">
                                <TableCell className="w-16 font-mono text-muted-foreground">#{b.id}</TableCell>
                                <TableCell className="font-medium text-ink">{b.name}</TableCell>
                                <TableCell className="text-right">
                                    <RowActions onEdit={() => openEdit(b)} onDelete={() => { setDelErr(null); setToDelete(b); }} />
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && brands?.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={3} className="h-16 text-center text-muted-foreground">Sin marcas registradas.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>{editing ? 'Editar Marca' : 'Nueva Marca'}</DialogTitle></DialogHeader>
                    <div className="grid gap-3 py-2">
                        <Label className={capsHead}>Nombre *</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="ej. Nike, Jordan, Puma" maxLength={50} className="h-11" />
                        {err && <p className={errorBox}>{err}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>{save.isPending ? 'Guardando...' : 'Guardar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ConfirmDialog
                open={!!toDelete}
                title="Eliminar marca"
                description={`¿Eliminar "${toDelete?.name}"? Esta acción no se puede deshacer.`}
                isPending={del.isPending}
                error={delErr}
                onConfirm={() => toDelete && del.mutate(toDelete.id)}
                onOpenChange={(o) => { if (!o) { setToDelete(null); setDelErr(null); } }}
            />
        </div>
    );
}

// ── CATEGORÍAS ───────────────────────────────────────────────────────────────
function CategoriesTab() {
    const qc = useQueryClient();
    const [editing, setEditing] = useState<Category | null>(null);
    const [name, setName] = useState('');
    const [open, setOpen] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [toDelete, setToDelete] = useState<Category | null>(null);
    const [delErr, setDelErr] = useState<string | null>(null);

    const { data: cats, isLoading } = useQuery({ queryKey: ['categories'], queryFn: catalogService.getCategories });
    const save = useMutation({
        mutationFn: () => editing ? catalogService.updateCategory(editing.id, name) : catalogService.createCategory(name),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setOpen(false); },
        onError: (e: Error) => setErr(parseFKError(e.message)),
    });
    const del = useMutation({
        mutationFn: (id: number) => catalogService.deleteCategory(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setToDelete(null); },
        onError: (e: Error) => setDelErr(parseFKError(e.message)),
    });

    const openCreate = () => { setEditing(null); setName(''); setErr(null); setOpen(true); };
    const openEdit = (c: Category) => { setEditing(c); setName(c.name); setErr(null); setOpen(true); };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" />Nueva Categoría</Button>
            </div>
            <div className="overflow-hidden rounded-xl border border-hairline">
                <Table>
                    <TableHeader>
                        <TableRow className="border-hairline hover:bg-transparent">
                            <TableHead className={`w-16 ${capsHead}`}>ID</TableHead>
                            <TableHead className={capsHead}>Nombre</TableHead>
                            <TableHead className={`text-right ${capsHead}`}>Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && <TableRow><TableCell colSpan={3} className="h-16 text-center text-muted-foreground">Cargando...</TableCell></TableRow>}
                        {cats?.map(c => (
                            <TableRow key={c.id} className="border-hairline hover:bg-secondary/60">
                                <TableCell className="w-16 font-mono text-muted-foreground">#{c.id}</TableCell>
                                <TableCell className="font-medium text-ink">{c.name}</TableCell>
                                <TableCell className="text-right">
                                    <RowActions onEdit={() => openEdit(c)} onDelete={() => { setDelErr(null); setToDelete(c); }} />
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && cats?.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={3} className="h-16 text-center text-muted-foreground">Sin categorías registradas.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>{editing ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle></DialogHeader>
                    <div className="grid gap-3 py-2">
                        <Label className={capsHead}>Nombre *</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="ej. Shorts, Camisetas, Pantalones" maxLength={50} className="h-11" />
                        {err && <p className={errorBox}>{err}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>{save.isPending ? 'Guardando...' : 'Guardar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ConfirmDialog
                open={!!toDelete}
                title="Eliminar categoría"
                description={`¿Eliminar "${toDelete?.name}"? Esta acción no se puede deshacer.`}
                isPending={del.isPending}
                error={delErr}
                onConfirm={() => toDelete && del.mutate(toDelete.id)}
                onOpenChange={(o) => { if (!o) { setToDelete(null); setDelErr(null); } }}
            />
        </div>
    );
}

// ── PRODUCTOS ────────────────────────────────────────────────────────────────
function ProductsTab() {
    const qc = useQueryClient();
    const [editing, setEditing] = useState<ProductWithRelations | null>(null);
    const [open, setOpen] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [price, setPrice] = useState('');
    const [cost, setCost] = useState('');
    const [brandId, setBrandId] = useState('');
    const [catId, setCatId] = useState('');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [imageUploading, setImageUploading] = useState(false);
    const [toDelete, setToDelete] = useState<ProductWithRelations | null>(null);
    const [delErr, setDelErr] = useState<string | null>(null);

    const { data: products, isLoading } = useQuery({ queryKey: ['products'], queryFn: catalogService.getProducts });
    const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: catalogService.getBrands });
    const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: catalogService.getCategories });

    const reset = () => { setName(''); setDesc(''); setPrice(''); setCost(''); setBrandId(''); setCatId(''); setImageUrl(null); setErr(null); };
    const openCreate = () => { setEditing(null); reset(); setOpen(true); };
    const openEdit = (p: ProductWithRelations) => {
        setEditing(p); setName(p.name); setDesc(p.description || '');
        setPrice(String(p.base_price)); setCost(p.cost != null ? String(p.cost) : '');
        setBrandId(String(p.brand_id)); setCatId(String(p.category_id));
        setImageUrl(p.image_url ?? null);
        setErr(null); setOpen(true);
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setErr(null);
        setImageUploading(true);
        try {
            const url = await catalogService.uploadProductImage(file);
            setImageUrl(url);
        } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : 'Error al subir la imagen.');
        } finally {
            setImageUploading(false);
            e.target.value = ''; // permitir re-subir el mismo archivo
        }
    };

    const save = useMutation({
        mutationFn: () => {
            const payload = { name, description: desc || null, base_price: parseFloat(price), cost: cost.trim() ? parseFloat(cost.replace(/,/g, '.')) : null, brand_id: Number(brandId), category_id: Number(catId), image_url: imageUrl };
            return editing ? catalogService.updateProduct(editing.id, payload) : catalogService.createProduct(payload);
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setOpen(false); },
        onError: (e: Error) => setErr(parseFKError(e.message)),
    });

    const del = useMutation({
        mutationFn: (id: number) => catalogService.deleteProduct(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setToDelete(null); },
        onError: (e: Error) => setDelErr(parseFKError(e.message)),
    });

    const isValid = name.trim() && brandId && catId && parseFloat(price) > 0;

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" />Nuevo Producto</Button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-hairline">
                <Table>
                    <TableHeader>
                        <TableRow className="border-hairline hover:bg-transparent">
                            <TableHead className={`w-16 ${capsHead}`}>ID</TableHead>
                            <TableHead className={capsHead}>Producto</TableHead>
                            <TableHead className={capsHead}>Marca</TableHead>
                            <TableHead className={capsHead}>Categoría</TableHead>
                            <TableHead className={`text-right ${capsHead}`}>Precio Base</TableHead>
                            <TableHead className={`text-right ${capsHead}`}>Costo</TableHead>
                            <TableHead className={`text-right ${capsHead}`}>Margen</TableHead>
                            <TableHead className={`text-right ${capsHead}`}>Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && <TableRow><TableCell colSpan={8} className="h-16 text-center text-muted-foreground">Cargando...</TableCell></TableRow>}
                        {products?.map(p => (
                            <TableRow key={p.id} className="border-hairline hover:bg-secondary/60">
                                <TableCell className="w-16 font-mono text-muted-foreground">#{p.id}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-hairline bg-secondary">
                                            {p.image_url
                                                ? <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                                                : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                                        </div>
                                        <span className="font-medium text-ink">{p.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{p.brands?.name ?? '—'}</TableCell>
                                <TableCell>
                                    {p.categories?.name
                                        ? <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{p.categories.name}</span>
                                        : '—'}
                                </TableCell>
                                <TableCell className="text-right font-mono text-ink">{formatCurrency(p.base_price)}</TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">{p.cost != null ? formatCurrency(p.cost) : '—'}</TableCell>
                                <TableCell className="text-right font-mono">
                                    {(() => {
                                        const margin = productMargin(p.base_price, p.cost);
                                        if (margin == null) return <span className="text-muted-foreground/50">—</span>;
                                        return <span className={margin >= 0 ? 'text-status-available' : 'text-status-returned'}>{margin.toFixed(0)}%</span>;
                                    })()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <RowActions onEdit={() => openEdit(p)} onDelete={() => { setDelErr(null); setToDelete(p); }} />
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && products?.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={8} className="h-16 text-center text-muted-foreground">Sin productos en el catálogo.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>{editing ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-2">
                        {/* Foto del producto */}
                        <div className="grid gap-1.5">
                            <Label className={capsHead}>Foto (opcional)</Label>
                            <div className="flex items-center gap-3">
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-hairline bg-secondary">
                                    {imageUrl
                                        ? <img src={imageUrl} alt="Vista previa" className="h-full w-full object-cover" />
                                        : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-secondary ${imageUploading ? 'pointer-events-none opacity-60' : ''}`}>
                                        {imageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                        {imageUploading ? 'Subiendo...' : (imageUrl ? 'Cambiar foto' : 'Subir foto')}
                                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} disabled={imageUploading} />
                                    </label>
                                    {imageUrl && !imageUploading && (
                                        <button type="button" onClick={() => setImageUrl(null)} className="text-left text-xs font-medium text-status-returned hover:underline">
                                            Quitar foto
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">JPG, PNG o WebP · máx. 5 MB</p>
                        </div>
                        <div className="grid gap-1.5">
                            <Label className={capsHead}>Nombre *</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="ej. Short Deportivo, Playera Básica" maxLength={100} className="h-11" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1.5">
                                <Label className={capsHead}>Marca *</Label>
                                <select className={selectClass} value={brandId} onChange={e => setBrandId(e.target.value)}>
                                    <option value="" disabled>Seleccionar...</option>
                                    {brands?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label className={capsHead}>Categoría *</Label>
                                <select className={selectClass} value={catId} onChange={e => setCatId(e.target.value)}>
                                    <option value="" disabled>Seleccionar...</option>
                                    {cats?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1.5">
                                <Label className={capsHead}>Precio Base (MXN) *</Label>
                                <Input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="ej. 250.00" className="h-11 font-mono" />
                            </div>
                            <div className="grid gap-1.5">
                                <Label className={capsHead}>Costo (MXN)</Label>
                                <Input type="number" step="0.01" min="0" value={cost} onChange={e => setCost(e.target.value)} placeholder="ej. 100.00" className="h-11 font-mono" />
                            </div>
                        </div>
                        {price && cost && parseFloat(price) > 0 && (
                            <p className="-mt-2 text-xs text-muted-foreground">
                                Margen esperado:{' '}
                                <span className="font-semibold text-status-available">
                                    {productMargin(parseFloat(price), parseFloat(cost.replace(/,/g, '.')))?.toFixed(0)}%
                                </span>{' '}
                                · Utilidad por prenda {formatCurrency(parseFloat(price) - parseFloat(cost.replace(/,/g, '.')))}
                            </p>
                        )}
                        <div className="grid gap-1.5">
                            <Label className={capsHead}>Descripción (opcional)</Label>
                            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="ej. Algodón 100%, corte slim" className="h-11" />
                        </div>
                        {err && <p className={errorBox}>{err}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button onClick={() => save.mutate()} disabled={!isValid || save.isPending}>{save.isPending ? 'Guardando...' : 'Guardar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ConfirmDialog
                open={!!toDelete}
                title="Eliminar producto"
                description={`¿Eliminar "${toDelete?.name}"?\n⚠️ Esto eliminará TAMBIÉN todas sus prendas físicas en inventario.`}
                confirmLabel="Eliminar producto"
                isPending={del.isPending}
                error={delErr}
                onConfirm={() => toDelete && del.mutate(toDelete.id)}
                onOpenChange={(o) => { if (!o) { setToDelete(null); setDelErr(null); } }}
            />
        </div>
    );
}

// ── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
type TabId = 'brands' | 'categories' | 'products';
const TABS: { id: TabId; label: string; desc: string }[] = [
    { id: 'brands', label: 'Marcas', desc: 'Fabricantes y marcas disponibles.' },
    { id: 'categories', label: 'Categorías', desc: 'Tipos de prendas (Shorts, Camisetas, etc.).' },
    { id: 'products', label: 'Productos', desc: 'Catálogo maestro. Eliminar un producto elimina sus prendas físicas en inventario.' },
];

export default function CatalogsPage() {
    const [active, setActive] = useState<TabId>('brands');
    const tab = TABS.find(t => t.id === active)!;

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div>
                <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-[32px]">Gestión de Catálogos</h1>
                <p className="mt-1 text-sm text-muted-foreground">Administra marcas, categorías y el catálogo maestro de productos.</p>
            </div>
            <div className="rounded-xl border border-hairline bg-card shadow-soft">
                {/* Pestañas */}
                <div role="tablist" aria-label="Catálogos" className="flex gap-2 border-b border-hairline px-4">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            role="tab"
                            aria-selected={active === t.id}
                            onClick={() => setActive(t.id)}
                            className={`-mb-px border-b-2 px-3 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${active === t.id
                                ? 'border-ink text-ink'
                                : 'border-transparent text-muted-foreground hover:text-ink'
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="p-4 sm:p-6">
                    <p className="mb-4 text-sm text-muted-foreground">{tab.desc}</p>
                    {active === 'brands' && <BrandsTab />}
                    {active === 'categories' && <CategoriesTab />}
                    {active === 'products' && <ProductsTab />}
                </div>
            </div>
        </div>
    );
}
