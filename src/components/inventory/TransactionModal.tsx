import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../../services/inventory';
import { useAuth } from '../../hooks';
import type { ItemStatus } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';

interface TransactionModalProps {
  item: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TransactionModal({ item, isOpen, onClose }: TransactionModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedStatus, setSelectedStatus] = useState<ItemStatus | ''>('');
  const [priceSold, setPriceSold] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Inicializar el estado de venta cuando se abre un ítem
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedStatus('');
      setPriceSold('');
      setNotes('');
      setError(null);
      onClose();
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Usuario no autenticado');
      if (!selectedStatus) throw new Error('Selecciona un nuevo estatus');
      
      const parsedPrice = selectedStatus === 'vendido' ? parseFloat(priceSold) : null;
      if (selectedStatus === 'vendido' && (isNaN(parsedPrice!) || parsedPrice! <= 0)) {
        throw new Error('Ingresa un precio de venta válido');
      }

      await inventoryService.updateItemStatus({
        itemId: item.id,
        newStatus: selectedStatus as ItemStatus,
        priceSold: parsedPrice,
        userId: user.id,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      // Forzar recarga de los datos en background
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      handleOpenChange(false);
    },
    onError: (err: any) => {
      setError(err.message || 'Ocurrió un error en la transacción.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Actualizar Artículo #{item.id}</DialogTitle>
            <DialogDescription>
              {item.products?.name} - {item.products?.brands?.name} (Talla: {item.size.toUpperCase()})
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              <Label>Estatus Actual:</Label>
              <Badge variant="outline" className="uppercase">{item.status}</Badge>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Nuevo Estatus</Label>
              <select
                id="status"
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as ItemStatus)}
                required
              >
                <option value="" disabled>Selecciona una opción...</option>
                <option value="disponible">🟢 Disponible</option>
                <option value="apartado">🟡 Apartado</option>
                <option value="vendido">🔵 Vendido</option>
                <option value="devuelto">🔴 Devuelto</option>
              </select>
            </div>

            {/* Condición Crítica: Exigir cobro si se marca como Vendido */}
            {selectedStatus === 'vendido' && (
              <div className="grid gap-2 p-3 bg-indigo-50 rounded-md border border-indigo-100">
                <Label htmlFor="priceSold" className="text-indigo-900">
                  Precio Cobrado (Recomendado: ${item.products?.base_price})
                </Label>
                <Input
                  id="priceSold"
                  type="number"
                  step="0.01"
                  placeholder="Ej. 250.00"
                  value={priceSold}
                  onChange={(e) => setPriceSold(e.target.value)}
                  className="bg-white border-indigo-200"
                  required
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="notes">Notas / Comentarios (opcional)</Label>
              <Input
                id="notes"
                placeholder="Ej. Entregado a Juan Pérez en Punto X"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending || !selectedStatus}>
              {mutation.isPending ? 'Procesando...' : 'Confirmar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}