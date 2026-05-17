import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogService } from '../services/catalogs';
import { useToast } from '../hooks';
import { parseError } from '../lib/errors';
import { validators } from '../lib/validation';
import type { Brand, Category } from '../types';
import type { ProductWithRelations } from '../services/catalogs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { Skeleton } from '../components/ui/skeleton';
import { Pencil, Trash2, Plus, AlertTriangle, Tag, Layers, Package } from 'lucide-react';

// ── MARCAS ────────────────────────────────────────────────────────────────────
function BrandsTab() {
    const qc = useQueryClient();
    const toast = useToast();
    const [editing, setEditing] = useState<Brand | null>(null);
    const [name, setName] = useState('');
    const [open, setOpen] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<Brand | null>(null);

    const { data: brands, isLoading } = useQuery({ queryKey: ['brands'], queryFn: catalogService.getBrands });

    const save = useMutation({
        mutationFn: () => editing ? catalogService.updateBrand(editing.id, name.trim()) : catalogService.createBrand(name.trim()),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['brands'] });
            toast.success(editing ? 'Marca actualizada' : 'Marca creada', name.trim());
            setOpen(false);
        },
        onError: (e) => setErr(parseError(e)),
    });

    const del = useMutation({
        mutationFn: (id: number) => catalogService.deleteBrand(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['brands'] });
            qc.invalidateQueries({ queryKey: ['products'] });
            toast.success('Marca eliminada');
            setDeleting(null);
        },
        onError: (e) => {
            toast.error('No se pudo eliminar', parseError(e));
            setDeleting(null);
        },
    });

    const openCreate = () => { setEditing(null); setName(''); setErr(null); setOpen(true); };
    const openEdit = (b: Brand) => { setEditing(b); setName(b.name); setErr(null); setOpen(true); };

    const handleSave = () => {
        const v = validators.name(name, 'El nombre');
        if (!v.ok) { setErr(v.error ?? null); return; }
        setErr(null);
        save.mutate();
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" />Nueva Marca</Button>
            </div>
            <div className="rounded-lg border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-16">ID</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && brands?.map(b => (
                            <TableRow key={b.id}>
                                <TableCell className="font-mono text-gray-400 w-16">#{b.id}</TableCell>
                                <TableCell className="font-medium">{b.name}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50" onClick={() => setDeleting(b)}><Trash2 className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && brands?.length === 0 && (
                            <TableRow><TableCell colSpan={3} className="text-center h-20 text-gray-400">Sin marcas registradas.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>{editing ? 'Editar marca' : 'Nueva marca'}</DialogTitle></DialogHeader>
                    <div className="grid gap-2 py-2">
                        <Label htmlFor="brand-name">Nombre *</Label>
                        <Input id="brand-name" value={name} onChange={e => setName(e.target.value)} placeholder="ej. Nike, Jordan, Puma" maxLength={50} autoFocus className="h-11 sm:h-9" />
                        {err && <p className="text-xs text-rose-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{err}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={save.isPending} className="h-10 sm:h-8">Cancelar</Button>
                        <Button onClick={handleSave} disabled={!name.trim() || save.isPending} className="h-10 sm:h-8">{save.isPending ? 'Guardando…' : 'Guardar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deleting}
                onOpenChange={(o) => !o && setDeleting(null)}
                title={`Eliminar "${deleting?.name ?? ''}"`}
                description="Si hay productos asociados a esta marca, la operación fallará."
                destructive
                onConfirm={() => deleting && del.mutate(deleting.id)}
                loading={del.isPending}
            />
        </div>
    );
}

// ── CATEGORÍAS ───────────────────────────────────────────────────────────────
function CategoriesTab() {
    const qc = useQueryClient();
    const toast = useToast();
    const [editing, setEditing] = useState<Category | null>(null);
    const [name, setName] = useState('');
    const [open, setOpen] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<Category | null>(null);

    const { data: cats, isLoading } = useQuery({ queryKey: ['categories'], queryFn: catalogService.getCategories });

    const save = useMutation({
        mutationFn: () => editing ? catalogService.updateCategory(editing.id, name.trim()) : catalogService.createCategory(name.trim()),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['categories'] });
            toast.success(editing ? 'Categoría actualizada' : 'Categoría creada', name.trim());
            setOpen(false);
        },
        onError: (e) => setErr(parseError(e)),
    });

    const del = useMutation({
        mutationFn: (id: number) => catalogService.deleteCategory(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['categories'] });
            qc.invalidateQueries({ queryKey: ['products'] });
            toast.success('Categoría eliminada');
            setDeleting(null);
        },
        onError: (e) => { toast.error('No se pudo eliminar', parseError(e)); setDeleting(null); },
    });

    const openCreate = () => { setEditing(null); setName(''); setErr(null); setOpen(true); };
    const openEdit = (c: Category) => { setEditing(c); setName(c.name); setErr(null); setOpen(true); };

    const handleSave = () => {
        const v = validators.name(name, 'El nombre');
        if (!v.ok) { setErr(v.error ?? null); return; }
        setErr(null);
        save.mutate();
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" />Nueva Categoría</Button>
            </div>
            <div className="rounded-lg border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-16">ID</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && cats?.map(c => (
                            <TableRow key={c.id}>
                                <TableCell className="font-mono text-gray-400 w-16">#{c.id}</TableCell>
                                <TableCell className="font-medium">{c.name}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50" onClick={() => setDeleting(c)}><Trash2 className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && cats?.length === 0 && (
                            <TableRow><TableCell colSpan={3} className="text-center h-20 text-gray-400">Sin categorías registradas.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>{editing ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle></DialogHeader>
                    <div className="grid gap-2 py-2">
                        <Label htmlFor="cat-name">Nombre *</Label>
                        <Input id="cat-name" value={name} onChange={e => setName(e.target.value)} placeholder="ej. Shorts, Camisetas, Pantalones" maxLength={50} autoFocus className="h-11 sm:h-9" />
                        {err && <p className="text-xs text-rose-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{err}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={save.isPending} className="h-10 sm:h-8">Cancelar</Button>
                        <Button onClick={handleSave} disabled={!name.trim() || save.isPending} className="h-10 sm:h-8">{save.isPending ? 'Guardando…' : 'Guardar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deleting}
                onOpenChange={(o) => !o && setDeleting(null)}
                title={`Eliminar "${deleting?.name ?? ''}"`}
                description="Si hay productos asociados a esta categoría, la operación fallará."
                destructive
                onConfirm={() => deleting && del.mutate(deleting.id)}
                loading={del.isPending}
            />
        </div>
    );
}

// ── PRODUCTOS ────────────────────────────────────────────────────────────────
function ProductsTab() {
    const qc = useQueryClient();
    const toast = useToast();
    const [editing, setEditing] = useState<ProductWithRelations | null>(null);
    const [open, setOpen] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<ProductWithRelations | null>(null);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [price, setPrice] = useState('');
    const [brandId, setBrandId] = useState('');
    const [catId, setCatId] = useState('');

    const { data: products, isLoading } = useQuery({ queryKey: ['products'], queryFn: catalogService.getProducts });
    const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: catalogService.getBrands });
    const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: catalogService.getCategories });

    const reset = () => { setName(''); setDesc(''); setPrice(''); setBrandId(''); setCatId(''); setErr(null); };
    const openCreate = () => { setEditing(null); reset(); setOpen(true); };
    const openEdit = (p: ProductWithRelations) => {
        setEditing(p); setName(p.name); setDesc(p.description || '');
        setPrice(String(p.base_price)); setBrandId(String(p.brand_id)); setCatId(String(p.category_id));
        setErr(null); setOpen(true);
    };

    const save = useMutation({
        mutationFn: () => {
            const payload = { name: name.trim(), description: desc.trim() || null, base_price: parseFloat(price), brand_id: Number(brandId), category_id: Number(catId) };
            return editing ? catalogService.updateProduct(editing.id, payload) : catalogService.createProduct(payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['products'] });
            toast.success(editing ? 'Producto actualizado' : 'Producto creado', name.trim());
            setOpen(false);
        },
        onError: (e) => setErr(parseError(e)),
    });

    const del = useMutation({
        mutationFn: (id: number) => catalogService.deleteProduct(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['products'] });
            qc.invalidateQueries({ queryKey: ['inventory_items'] });
            toast.success('Producto eliminado', 'También se eliminaron sus prendas físicas.');
            setDeleting(null);
        },
        onError: (e) => { toast.error('No se pudo eliminar', parseError(e)); setDeleting(null); },
    });

    const handleSave = () => {
        const checks = [
            validators.name(name, 'El nombre'),
            validators.id(brandId, 'la marca'),
            validators.id(catId, 'la categoría'),
            validators.price(price),
        ];
        const failed = checks.find(c => !c.ok);
        if (failed) { setErr(failed.error ?? null); return; }
        setErr(null);
        save.mutate();
    };

    const isValid = name.trim() && brandId && catId && parseFloat(price) > 0;
    const selectClass = "flex h-11 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 sm:h-9";

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" />Nuevo Producto</Button>
            </div>
            <div className="rounded-lg border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-16">ID</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Marca</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead className="text-right">Precio base</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                                {Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                            </TableRow>
                        ))}
                        {!isLoading && products?.map(p => (
                            <TableRow key={p.id}>
                                <TableCell className="font-mono text-gray-400 w-16">#{p.id}</TableCell>
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell>{p.brands?.name ?? '—'}</TableCell>
                                <TableCell>{p.categories?.name ?? '—'}</TableCell>
                                <TableCell className="text-right font-medium tabular-nums">${p.base_price}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50" onClick={() => setDeleting(p)}><Trash2 className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && products?.length === 0 && (
                            <TableRow><TableCell colSpan={6} className="text-center h-20 text-gray-400">Sin productos en el catálogo.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>{editing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle></DialogHeader>
                    <div className="grid gap-3 py-2">
                        <div className="grid gap-1">
                            <Label>Nombre *</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="ej. Short Deportivo, Playera Básica" maxLength={100} className="h-11 sm:h-9" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1">
                                <Label>Marca *</Label>
                                <select className={selectClass} value={brandId} onChange={e => setBrandId(e.target.value)}>
                                    <option value="" disabled>Seleccionar…</option>
                                    {brands?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="grid gap-1">
                                <Label>Categoría *</Label>
                                <select className={selectClass} value={catId} onChange={e => setCatId(e.target.value)}>
                                    <option value="" disabled>Seleccionar…</option>
                                    {cats?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid gap-1">
                            <Label>Precio base (MXN) *</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">$</span>
                                <Input type="number" inputMode="decimal" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="250.00" className="pl-7 h-11 sm:h-9 tabular-nums" />
                            </div>
                        </div>
                        <div className="grid gap-1">
                            <Label>Descripción <span className="text-gray-400 font-normal">(opcional)</span></Label>
                            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="ej. Algodón 100%, corte slim" className="h-11 sm:h-9" />
                        </div>
                        {err && <p className="text-xs text-rose-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{err}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={save.isPending} className="h-10 sm:h-8">Cancelar</Button>
                        <Button onClick={handleSave} disabled={!isValid || save.isPending} className="h-10 sm:h-8">{save.isPending ? 'Guardando…' : 'Guardar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deleting}
                onOpenChange={(o) => !o && setDeleting(null)}
                title={`Eliminar "${deleting?.name ?? ''}"`}
                description="También se eliminarán TODAS sus prendas físicas del inventario. Esta acción no se puede deshacer."
                destructive
                confirmLabel="Sí, eliminar todo"
                onConfirm={() => deleting && del.mutate(deleting.id)}
                loading={del.isPending}
            />
        </div>
    );
}

// ── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
type TabId = 'brands' | 'categories' | 'products';

const TABS: { id: TabId; label: string; desc: string; Icon: typeof Tag }[] = [
    { id: 'brands',     label: 'Marcas',     desc: 'Fabricantes y marcas disponibles.', Icon: Tag },
    { id: 'categories', label: 'Categorías', desc: 'Tipos de prendas (Shorts, Camisetas, etc.).', Icon: Layers },
    { id: 'products',   label: 'Productos',  desc: 'Catálogo maestro. Eliminar un producto elimina sus prendas físicas en inventario.', Icon: Package },
];

export default function CatalogsPage() {
    const [active, setActive] = useState<TabId>('brands');
    const tab = TABS.find(t => t.id === active)!;

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Gestión de catálogos</h1>
                <p className="text-xs sm:text-sm text-gray-500">Administra marcas, categorías y el catálogo maestro de productos.</p>
            </div>
            <Card>
                <CardHeader className="pb-0">
                    <div className="flex gap-1 border-b overflow-x-auto scrollbar-none -mx-4 px-4 sm:-mx-0 sm:px-0">
                        {TABS.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActive(t.id)}
                                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                                    active === t.id
                                        ? 'border-gray-900 text-gray-900'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <t.Icon className="h-4 w-4" />
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <CardTitle className="mt-4 text-base">{tab.label}</CardTitle>
                    <CardDescription>{tab.desc}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    {active === 'brands' && <BrandsTab />}
                    {active === 'categories' && <CategoriesTab />}
                    {active === 'products' && <ProductsTab />}
                </CardContent>
            </Card>
        </div>
    );
}
