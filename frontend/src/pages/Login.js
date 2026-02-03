import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../utils/api';
import { setToken, setUser } from '../utils/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Calendar, Users, Package, TrendingUp, ArrowLeft } from 'lucide-react';

const LOGO_URL = '/logo-tna.png';

export const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'cliente'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const response = await apiClient.post('/auth/login', {
          email: formData.email,
          password: formData.password
        });
        setToken(response.data.token);
        setUser(response.data.user);
        toast.success('Bienvenido a TNA Office');
        
        if (response.data.user.role === 'admin' || response.data.user.role === 'comisionista') {
          navigate('/dashboard');
        } else {
          navigate('/');
        }
      } else {
        await apiClient.post('/auth/register', formData);
        toast.success('Cuenta creada exitosamente. Por favor inicia sesión.');
        setIsLogin(true);
        setFormData({ ...formData, password: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error en la operación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] flex">
      {/* Left side - Hero */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center"
        style={{
          backgroundImage: "url('/hero-background.jpg')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 to-black/50"></div>
        <div className="relative z-10 p-12 flex flex-col justify-between">
          <div>
            <img 
              src={LOGO_URL} 
              alt="TNA Office" 
              className="h-16 w-auto object-contain mb-4 brightness-0 invert"
            />
            <div className="h-1 w-32 tna-gradient mt-4"></div>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#0A0A0A] border border-zinc-800 rounded-sm flex items-center justify-center">
                <Calendar className="w-6 h-6 text-[#0097FF]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-white font-bold font-secondary uppercase text-sm">Salas & Casetas</h3>
                <p className="text-zinc-400 text-sm font-primary">Sistema de agendamiento inteligente</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#0A0A0A] border border-zinc-800 rounded-sm flex items-center justify-center">
                <Package className="w-6 h-6 text-[#FF3D3D]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-white font-bold font-secondary uppercase text-sm">Productos & Servicios</h3>
                <p className="text-zinc-400 text-sm font-primary">Catálogo completo de soluciones</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#0A0A0A] border border-zinc-800 rounded-sm flex items-center justify-center">
                <Users className="w-6 h-6 text-[#FF8A00]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-white font-bold font-secondary uppercase text-sm">Comisionistas</h3>
                <p className="text-zinc-400 text-sm font-primary">Gestión de ventas y comisiones</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#0A0A0A] border border-zinc-800 rounded-sm flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#00E5FF]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-white font-bold font-secondary uppercase text-sm">Dashboard Avanzado</h3>
                <p className="text-zinc-400 text-sm font-primary">Métricas y reportes en tiempo real</p>
              </div>
            </div>
          </div>
          
          <div className="text-zinc-500 text-sm font-primary">
            Badajoz 45, Piso 17, Las Condes, Santiago de Chile
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center lg:items-start">
            <img 
              src={LOGO_URL} 
              alt="TNA Office" 
              className="h-12 w-auto object-contain mb-6 lg:hidden brightness-0 invert"
            />
            <h2 className="font-secondary text-4xl font-bold uppercase text-white tracking-tight">
              {isLogin ? 'INICIAR SESIÓN' : 'CREAR CUENTA'}
            </h2>
            <p className="text-zinc-400 mt-2 font-primary">
              {isLogin ? 'Accede a tu panel de control' : 'Únete a TNA Office'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <Label htmlFor="name" className="text-white font-primary font-medium">Nombre completo</Label>
                <Input
                  id="name"
                  data-testid="register-name-input"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-2 bg-[#121212] border-zinc-800 text-white focus:ring-1 focus:ring-white rounded-sm"
                  placeholder="Tu nombre"
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-white font-primary font-medium">Email</Label>
              <Input
                id="email"
                data-testid="login-email-input"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-2 bg-[#121212] border-zinc-800 text-white focus:ring-1 focus:ring-white rounded-sm"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-white font-primary font-medium">Contraseña</Label>
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-2 bg-[#121212] border-zinc-800 text-white focus:ring-1 focus:ring-white rounded-sm"
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-zinc-200 rounded-sm font-bold uppercase tracking-wide py-6 font-secondary"
            >
              {loading ? 'PROCESANDO...' : (isLogin ? 'INGRESAR' : 'REGISTRARSE')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-zinc-400 hover:text-white transition-colors font-primary text-sm"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>

          {/* Link para volver a explorar servicios */}
          <div className="mt-4 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[#FF8A00] hover:text-[#FF8A00]/80 transition-colors font-primary text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a explorar servicios
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};