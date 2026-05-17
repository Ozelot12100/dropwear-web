import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks';
import { parseError } from '../lib/errors';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Eye, EyeOff, LogIn, Mail, Lock } from 'lucide-react';
import Logo from '../assets/logo.png';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const toast = useToast();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password) {
            toast.warning('Datos incompletos', 'Captura correo y contraseña.');
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
            toast.error('No pudimos iniciar sesión', parseError(error));
            setLoading(false);
            return;
        }
        navigate('/', { replace: true });
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 flex items-center justify-center px-4 py-12">
            {/* Blobs decorativos */}
            <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-indigo-600/30 blur-3xl" aria-hidden />
            <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden />
            <div className="absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-purple-500/10 blur-3xl" aria-hidden />

            <div className="relative w-full max-w-sm">
                {/* Logo + título */}
                <div className="mb-6 flex flex-col items-center text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-1.5 shadow-2xl shadow-indigo-500/30 ring-1 ring-white/20">
                        <img src={Logo} alt="DropWear" className="h-full w-auto rounded-lg" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">DropWear</h1>
                    <p className="mt-1 text-xs text-white/60">Panel administrativo · Puerto Peñasco</p>
                </div>

                {/* Card de login glassmorphism */}
                <div className="rounded-2xl bg-white/95 p-6 shadow-2xl shadow-black/30 ring-1 ring-white/10 backdrop-blur-xl">
                    <h2 className="text-base font-semibold text-gray-900">Bienvenido de vuelta</h2>
                    <p className="mt-0.5 text-xs text-gray-500">Inicia sesión para acceder al inventario.</p>

                    <form className="mt-5 space-y-4" onSubmit={handleLogin}>
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-xs uppercase tracking-wider text-gray-600">Correo</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="socio@dropwear.com"
                                    className="pl-9 h-11 text-base sm:h-10 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="password" className="text-xs uppercase tracking-wider text-gray-600">Contraseña</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    id="password"
                                    type={showPwd ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="pl-9 pr-10 h-11 text-base sm:h-10 sm:text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPwd(s => !s)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                                    aria-label={showPwd ? 'Ocultar' : 'Mostrar'}
                                >
                                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 sm:h-10 gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-lg shadow-indigo-500/30"
                        >
                            <LogIn className="h-4 w-4" />
                            {loading ? 'Verificando…' : 'Acceder al sistema'}
                        </Button>
                    </form>
                </div>

                <p className="mt-4 text-center text-[11px] text-white/40">
                    © {new Date().getFullYear()} DropWear · Sistema interno
                </p>
            </div>
        </div>
    );
}
