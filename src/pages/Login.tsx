import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { AlertCircle, Loader2, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import Logo from '../assets/logo.png';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const cleanEmail = email.trim(); // Importante para móviles (espacios automáticos)

            // Agregamos un protector de tiempo (Timeout de 10 segundos) por si la red del móvil bloquea la petición
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("La red tardó demasiado en responder (Timeout).")), 10000)
            );

            const authPromise = supabase.auth.signInWithPassword({
                email: cleanEmail,
                password,
            });

            // Usamos Promise.race para no quedarnos atascados infinitamente
            // El timeout solo rechaza (Promise<never>), así que el valor resuelto
            // siempre es la respuesta de signInWithPassword.
            const response = await Promise.race([authPromise, timeoutPromise]) as Awaited<typeof authPromise>;

            if (response?.error) {
                // Si la respuesta regresó pero con error de Supabase
                setError(`Error de autenticación: ${response.error.message || 'Credenciales inválidas.'}`);
                setLoading(false);
            } else if (response?.data?.session) {
                // Éxito real
                // La app de Google (WebView) y algunos Chrome restringen los listeners de fondo (onAuthStateChange),
                // lo que ocasiona que la UI no se entere autónomamente del éxito.
                // Forzamos el salto con react-router, pero usando un retraso de seguridad de 500ms
                // para permitir que Supabase termine de liberar sus candados internos (Web Locks).
                setTimeout(() => {
                    navigate('/', { replace: true });
                }, 500);
            } else {
                // Respuesta inesperada
                setError('No se pudo establecer la sesión. Respuesta vacía del servidor.');
                setLoading(false);
            }
        } catch (err) {
            console.error("Error inesperado en login:", err);
            setError(`Error del sistema: ${err instanceof Error ? err.message : 'Bloqueo de red o caché activo.'}`);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-10">
            <div className="w-full max-w-md">
                {/* Logo + marca */}
                <div className="mb-8 flex flex-col items-center gap-3">
                    <img src={Logo} alt="DropWear" className="h-16 w-auto object-contain" />
                    <h1 className="font-heading text-3xl font-bold tracking-tight text-ink">DropWear</h1>
                </div>

                <Card className="rounded-2xl border-hairline shadow-soft">
                    <CardContent className="p-6 sm:p-8">
                        <form onSubmit={handleLogin} className="space-y-5">
                            {error && (
                                <div className="bg-status-returned/10 border border-status-returned/30 text-status-returned rounded-xl p-3 flex items-start gap-2 text-sm">
                                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                    <p className="leading-snug">{error}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Correo electrónico
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="usuario@dropwear.com"
                                        className="h-12 pl-11"
                                        autoComplete="email"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Contraseña
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="h-12 pl-11 pr-11"
                                        autoComplete="current-password"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <Button type="submit" disabled={loading} className="w-full h-12 text-base gap-2">
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Entrando...
                                    </>
                                ) : (
                                    <>
                                        Iniciar sesión
                                        <ArrowRight className="h-5 w-5" />
                                    </>
                                )}
                            </Button>

                            <p className="text-center text-sm text-muted-foreground leading-snug px-2">
                                El registro público se encuentra actualmente desactivado. Contacta a un administrador para obtener acceso.
                            </p>
                        </form>
                    </CardContent>
                </Card>

                <p className="mt-8 text-center text-xs text-muted-foreground">
                    Diseñado y desarrollado por{" "}
                    <a
                        href="https://www.davidramirez.com.mx/?utm_source=dropwear&utm_medium=footer&utm_campaign=credito"
                        target="_blank"
                        rel="noopener noreferrer author"
                        className="font-semibold text-ink/70 transition-colors hover:text-ink"
                    >
                        David A. Ramírez
                    </a>
                </p>
            </div>
        </div>
    );
}
