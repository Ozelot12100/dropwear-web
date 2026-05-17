import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import Logo from '../assets/logo.png';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const cleanEmail = email.trim(); // Importante para móviles (espacios automáticos)

            const { error: authError } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password,
            });

            if (authError) {
                setError('Credenciales inválidas. Por favor verifica tu correo y contraseña.');
                setLoading(false);
            } else {
                // Éxito: En vez de un `navigate` de React que causa rebotes, 
                // hacemos un salto nativo para limpiar contextos y forzar un montaje limpio.
                // Esto evade problemas de Safari/móviles pausando eventos reactivos.
                window.location.href = '/';
            }
        } catch (err: any) {
            console.error("Error inesperado en login:", err);
            setError('Error de conexión o configuración (revisa si tienes navegación privada/bloqueo de cookies activo).');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 w-full h-full bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]"></div>

            <div className="w-full max-w-md px-4 sm:px-0 relative z-10">
                <div className="mb-8 flex flex-col items-center">
                    <div className="relative">
                        <img
                            src={Logo}
                            alt="DropWear Logo"
                            className="h-28 w-auto object-contain drop-shadow-sm"
                        // Sin invert, ya que el fondo de la pantalla y logo son claros/transparentes.
                        // Si el logo original es negro, se verá perfecto sobre bg-gray-50.
                        />
                    </div>
                </div>

                <Card className="border-gray-200/60 shadow-xl shadow-black/[0.03] backdrop-blur-xl bg-white/95">
                    <CardHeader className="space-y-2 pb-6 text-center">
                        <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
                            Portal Administrativo
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-500">
                            Ingresa tus credenciales para acceder al sistema
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-3 flex items-start gap-2 text-sm animate-in fade-in slide-in-from-top-1">
                                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
                                    <p className="leading-snug">{error}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-700 font-medium">Correo Electrónico</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@dropwear.mx"
                                    className="bg-white border-gray-300 focus-visible:ring-gray-900 focus-visible:border-gray-900 placeholder:text-gray-400 transition-all"
                                    autoComplete="email"
                                    disabled={loading}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-gray-700 font-medium">Contraseña</Label>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="bg-white border-gray-300 focus-visible:ring-gray-900 focus-visible:border-gray-900 transition-all"
                                    autoComplete="current-password"
                                    disabled={loading}
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-black hover:bg-gray-900 text-white font-semibold transition-all shadow-md mt-6 relative overflow-hidden group"
                            >
                                <span className="absolute bottom-0 left-0 w-full h-[3px] bg-red-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></span>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Verificando...
                                    </>
                                ) : (
                                    'Iniciar Sesión'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex justify-center border-t border-gray-100 pt-6 pb-6">
                        <p className="text-xs text-gray-400 font-medium">
                            Sistema exclusivo para personal autorizado.
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}