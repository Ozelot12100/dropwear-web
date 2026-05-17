import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { inventoryService } from '../services/inventory';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { TransactionModal } from '../components/inventory/TransactionModal';

// Utilidad para extraer el color del status
const statusColorMap: Record<string, string> = {
    disponible: 'bg-green-100 text-green-800 hover:bg-green-100',
    apartado: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    vendido: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100',
    devuelto: 'bg-red-100 text-red-800 hover:bg-red-100',
};

export default function Dashboard() {
    const queryClient = useQueryClient();

    // Estado para controlar el Modal Transaccional
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 1. React Query maneja el fetching, loading state y caching
    const { data: items, isLoading, isError } = useQuery({
        queryKey: ['inventory_items'],
        queryFn: inventoryService.getAllItems
    });

    // 2. Suscripción en Tiempo Real de Supabase
    useEffect(() => {
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'inventory_items'
                },
                (payload) => {
                    console.log('Cambio detectado en Supabase Realtime:', payload);
                    // Invalidamos la caché, lo cual fuerza a useQuery a hacer refetch en background automático
                    queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    if (isLoading) return <div>Cargando inventario maestro...</div>;
    if (isError) return <div>Error cargando inventario.</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Inventario Global</h1>
                <p className="text-sm text-gray-500">Administración de existencias y estatus en tiempo real.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Listado de Prendas</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Diseño optimizado con shadcn/ui Table */}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">ID</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Marca</TableHead>
                                    <TableHead>Talla</TableHead>
                                    <TableHead>Color</TableHead>
                                    <TableHead>Estatus</TableHead>
                                    <TableHead className="text-right">Precio Base / Venta</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items?.map((item: any) => (
                                    <TableRow
                                        key={item.id}
                                        className="cursor-pointer hover:bg-gray-50"
                                        onClick={() => {
                                            setSelectedItem(item);
                                            setIsModalOpen(true);
                                        }}
                                    >
                                        <TableCell className="font-medium">#{item.id}</TableCell>
                                        <TableCell>{item.products?.name}</TableCell>
                                        <TableCell>{item.products?.brands?.name}</TableCell>
                                        <TableCell className="uppercase">{item.size}</TableCell>
                                        <TableCell className="capitalize">{item.color}</TableCell>
                                        <TableCell>
                                            <Badge className={statusColorMap[item.status] || 'bg-gray-100 text-gray-800'}>
                                                {item.status.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.status === 'vendido'
                                                ? <span className="font-bold text-green-700">${item.price_sold}</span>
                                                : <span className="text-gray-600">${item.products?.base_price}</span>
                                            }
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {items?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            No hay artículos físicos en el almacén.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Modal de Transacción incrustado */}
            <TransactionModal
                item={selectedItem}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}