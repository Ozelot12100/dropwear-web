import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogService } from '../services/catalogs';
import type { Brand, Category } from '../types';
import type { ProductWithRelations } from '../services/catalogs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Pencil, Trash2, Plus } from 'lucide-react';

function parseFKError(msg: string): string {
    if (msg.includes('foreign key constraint')) return 'No se puede eliminar: hay registros asociados en uso.';
    if (msg.includes('unique')) return 'Ya existe un registro con ese nombre.';
    return msg;
}

// ── MARCAS ───────────────────────────────────────────────────────────────────
function BrandsTab() {
    const qc = useQueryClient();
    const [editing, setEditing] = useState<Brand | null>(null);
    const [name, setName] = useState('');
    const [open, setOpen] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const { data: brands, isLoading } = useQuery({ queryKey: ['brands'], queryFn: catalogService.getBrands });
    const save = useMutation({
        mutationFn: () => editing ? catalogService.updateBrand(editing.id, name) : catalogService.createBrand(name),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['brands'] }); setOpen(false); },
        onError: (e: Error) => setErr(parseFKError(e.message)),
    });
    const del = useMutation({
        mutationFn: (id: number) => catalogService.deleteBrand(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['brands'] }),
        onError: (e: Error) => alert(parseFKError(e.message)),
    });

    const openCreate = () => { setEditing(null); setName(''); setErr(null); setOpen(true); };
    const openEdit = (b: Brand) => { setEditing(b); setName(b.name); setErr(null); setOpen(true); };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" />Nueva Marca</Button>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Nombre</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {isLoading && <TableRow><TableCell colSpan={3} className="text-center h-16 text-gray-400">Cargando...</TableCell></TableRow>}
                        {brands?.map(b => (
                            <TableRow key={b.id}>
                                <TableCell className="font-mono text-gray-400 w-16">#{b.id}</TableCell>
                                <TableCell className="font-medium">{b.name}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => { if (confirm(`¿Eliminar "${b.name}"?`)) del.mutate(b.id); }}><Trash2 className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && brands?.length === 0 && <TableRow><TableCell colSpan={3} className="text-center h-16 text-gray-400">Sin marcas registradas.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>{editing ? 'Editar Marca' : 'Nueva Marca'}</DialogTitle></DialogHeader>
                    <div className="grid gap-3 py-2">
                        <Label>Nombre *</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="ej. Nike, Jordan, Puma" maxLength={50} />
                        {err && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{err}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>{save.isPending ? 'Guardando...' : 'Guardar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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

    const { data: cats, isLoading } = useQuery({ queryKey: ['categories'], queryFn: catalogService.getCategories });
    const save = useMutation({
        mutationFn: () => editing ? catalogService.updateCategory(editing.id, name) : catalogService.createCategory(name),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setOpen(false); },
        onError: (e: Error) => setErr(parseFKError(e.message)),
    });
    const del = useMutation({
        mutationFn: (id: number) => catalogService.deleteCategory(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
        onError: (e: Error) => alert(parseFKError(e.message)),
    });

    const openCreate = () => { setEditing(null); setName(''); setErr(null); setOpen(true); };
    const openEdit = (c: Category) => { setEditing(c); setName(c.name); setErr(null); setOpen(true); };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" />Nueva Categoría</Button>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Nombre</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {isLoading && <TableRow><TableCell colSpan={3} className="text-center h-16 text-gray-400">Cargando...</TableCell></TableRow>}
                        {cats?.map(c => (
                            <TableRow key={c.id}>
                                <TableCell className="font-mono text-gray-400 w-16">#{c.id}</TableCell>
                                <TableCell className="font-medium">{c.name}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => { if (confirm(`¿Eliminar "${c.name}"?`)) del.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && cats?.length === 0 && <TableRow><TableCell colSpan={3} className="text-center h-16 text-gray-400">Sin categorías registradas.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>{editing ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle></DialogHeader>
                    <div className="grid gap-3 py-2">
                        <Label>Nombre *</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="ej. Shorts, Camisetas, Pantalones" maxLength={50} />
                        {err && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{err}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>{save.isPending ? 'Guardando...' : 'Guardar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
            const payload = { name, description: desc || null, base_price: parseFloat(price), brand_id: Number(brandId), category_id: Number(catId) };
            return editing ? catalogService.updateProduct(editing.id, payload) : catalogService.createProduct(payload);
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setOpen(false); },
        onError: (e: Error) => setErr(parseFKError(e.message)),
    });

    const del = useMutation({
        mutationFn: (id: number) => catalogService.deleteProduct(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
        onError: (e: Error) => alert(parseFKError(e.message)),
    });

    const isValid = name.trim() && brandId && catId && parseFloat(price) > 0;

    const selectClass = "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950";

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" />Nuevo Producto</Button>
            </div>
            <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead><TableHead>Nombre</TableHead><TableHead>Marca</TableHead>
                            <TableHead>Categoría</TableHead><TableHead className="text-right">Precio Base</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && <TableRow><TableCell colSpan={6} className="text-center h-16 text-gray-400">Cargando...</TableCell></TableRow>}
                        {products?.map(p => (
                            <TableRow key={p.id}>
                                <TableCell className="font-mono text-gray-400 w-16">#{p.id}</TableCell>
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell>{p.brands?.name ?? '—'}</TableCell>
                                <TableCell>{p.categories?.name ?? '—'}</TableCell>
                                <TableCell className="text-right font-medium">${p.base_price}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => { if (confirm(`¿Eliminar "${p.name}"?\n⚠️ Esto eliminará TODAS sus prendas físicas en inventario.`)) del.mutate(p.id); }}><Trash2 className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && products?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center h-16 text-gray-400">Sin productos en el catálogo.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>{editing ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle></DialogHeader>
                    <div className="grid gap-3 py-2">
                        <div className="grid gap-1">
                            <Label>Nombre *</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="ej. Short Deportivo, Playera Básica" maxLength={100} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1">
                                <Label>Marca *</Label>
                                <select className={selectClass} value={brandId} onChange={e => setBrandId(e.target.value)}>
                                    <option value="" disabled>Seleccionar...</option>
                                    {brands?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="grid gap-1">
                                <Label>Categoría *</Label>
                                <select className={selectClass} value={catId} onChange={e => setCatId(e.target.value)}>
                                    <option value="" disabled>Seleccionar...</option>
                                    {cats?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid gap-1">
                            <Label>Precio Base (MXN) *</Label>
                            <Input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="ej. 250.00" />
                        </div>
                        <div className="grid gap-1">
                            <Label>Descripción (opcional)</Label>
                            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="ej. Algodón 100%, corte slim" />
                        </div>
                        {err && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{err}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button onClick={() => save.mutate()} disabled={!isValid || save.isPending}>{save.isPending ? 'Guardando...' : 'Guardar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de Catálogos</h1>
                <p className="text-sm text-gray-500">Administra marcas, categorías y el catálogo maestro de productos.</p>
            </div>
            <Card>
                <CardHeader className="pb-0">
                    <div className="flex gap-1 border-b">
                        {TABS.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActive(t.id)}
                                className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${active === t.id ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
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
