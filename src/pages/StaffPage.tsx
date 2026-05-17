import React, { useState, useEffect } from 'react';
import { usersService } from '../services/users';
import type { UserProfile, UserRole } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { UserPlus, ShieldAlert, Users } from 'lucide-react';

export default function StaffPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'socio' as UserRole
    });

    const loadUsers = async () => {
        try {
            setIsLoading(true);
            const data = await usersService.getUsers();
            setUsers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            await usersService.createUser(formData);
            await loadUsers(); // Refrescar la tabla
            setIsDialogOpen(false); // Cerrar modal
            setFormData({ email: '', password: '', full_name: '', role: 'socio' }); // Limpiar formulario
        } catch (err: any) {
            setError(err.message || 'Error al crear el usuario');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                        <Users className="w-6 h-6 text-gray-900" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gestión de Personal</h1>
                        <p className="text-sm text-gray-500">Administra los accesos y roles de los colaboradores.</p>
                    </div>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Nuevo Colaborador
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-white">
                        <DialogHeader>
                            <DialogTitle className="text-xl">Agregar Personal</DialogTitle>
                        </DialogHeader>
                        
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 shrink-0" />
                                <span className="font-medium">{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Nombre Completo</Label>
                                <Input 
                                    id="full_name" 
                                    name="full_name"
                                    placeholder="Ej. Juan Pérez"
                                    required 
                                    value={formData.full_name}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Correo Electrónico</Label>
                                <Input 
                                    id="email" 
                                    name="email"
                                    type="email" 
                                    placeholder="correo@ejemplo.com"
                                    required 
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Contraseña Temporal</Label>
                                <Input 
                                    id="password" 
                                    name="password"
                                    type="password" 
                                    placeholder="Mínimo 6 caracteres"
                                    required 
                                    minLength={6}
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Rol en el Sistema</Label>
                                <select 
                                    id="role"
                                    name="role"
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.role}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="socio">Socio (Operaciones)</option>
                                    <option value="vendedor">Vendedor (Limitado)</option>
                                    <option value="repartidor">Repartidor (Entregas)</option>
                                    <option value="contador">Contador (Lectura)</option>
                                    <option value="superadmin">Super Administrador</option>
                                </select>
                            </div>
                            <Button 
                                type="submit" 
                                className="w-full bg-gray-900 hover:bg-black text-white" 
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Creando Usuario...' : 'Guardar Colaborador'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            <TableHead className="w-[300px]">Nombre</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Fecha de Ingreso</TableHead>
                            <TableHead className="text-right">ID del Sistema</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-gray-500">Cargando personal...</TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-gray-500">No hay colaboradores registrados.</TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id} className="hover:bg-gray-50/50">
                                    <TableCell className="font-medium text-gray-900">{user.full_name}</TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant={user.role === 'superadmin' ? 'destructive' : 'secondary'}
                                            className="uppercase text-[10px] tracking-wider"
                                        >
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-sm">
                                        {new Date(user.created_at || '').toLocaleDateString('es-MX', {
                                            year: 'numeric', month: 'short', day: 'numeric'
                                        })}
                                    </TableCell>
                                    <TableCell className="text-right text-gray-400 text-xs font-mono">
                                        {user.id.split('-')[0]}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
