import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { Package } from 'lucide-react';

export default function App() {
    const [items, setItems] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        // 1. Cargar datos iniciales
        const fetchInitialData = async () => {
            const { data: inventoryData } = await supabase.from('inventory_items').select('*');
            const { data: logsData } = await supabase.from('inventory_logs').select('*').order('created_at', { ascending: false }).limit(10);

            if (inventoryData) setItems(inventoryData);
            if (logsData) setLogs(logsData);
        };

        fetchInitialData();

        // 2. Suscribirse a cambios en tiempo real
        const inventorySubscription = supabase
            .channel('inventory_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' },
                (payload) => {
                    console.log('Cambio en inventory_items:', payload);
                    // Actualización optimista o recargar datos
                    fetchInitialData();
                }
            )
            .subscribe();

        const logsSubscription = supabase
            .channel('logs_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inventory_logs' },
                (payload) => {
                    setLogs(prev => [payload.new, ...prev].slice(0, 10));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(inventorySubscription);
            supabase.removeChannel(logsSubscription);
        };
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-8 flex items-center space-x-3 text-indigo-600">
                <Package size={32} />
                <h1 className="text-3xl font-bold text-gray-900">DropWear - Inventario en Tiempo Real</h1>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="col-span-2 bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Items en Inventario</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU / Producto</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {items.map(item => (
                                    <tr key={item.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.id.slice(0, 8)}...</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                {item.status || 'available'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.product_id}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Logs Recientes</h2>
                    <div className="space-y-4">
                        {logs.map(log => (
                            <div key={log.id} className="border-l-4 border-indigo-500 pl-3 py-1">
                                <p className="text-sm font-medium text-gray-900">{log.action_type || 'UPDATE'}</p>
                                <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}