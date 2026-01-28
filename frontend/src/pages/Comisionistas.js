import { useState, useEffect } from 'react';
import apiClient from '../utils/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Plus, Trash2, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const Comisionistas = () => {
  const [comisionistas, setComisionistas] = useState([]);
  const [stats, setStats] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await apiClient.get('/comisionistas');
      setComisionistas(response.data);
      
      // Load stats for each comisionista
      const statsPromises = response.data.map(c => 
        apiClient.get(`/comisionistas/${c.id}/stats`)
      );
      const statsResponses = await Promise.all(statsPromises);
      const statsMap = {};
      response.data.forEach((c, index) => {
        statsMap[c.id] = statsResponses[index].data;
      });
      setStats(statsMap);
    } catch (error) {
      toast.error('Error al cargar comisionistas');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/auth/register', {
        ...form,
        role: 'comisionista',
        commission_percentage: 0
      });
      toast.success('Comisionista creado');
      setShowModal(false);
      setForm({ name: '', email: '', password: '' });
      loadData();
    } catch (error) {
      toast.error('Error al crear comisionista');
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/comisionistas/${id}`);
      toast.success('Comisionista eliminado');
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      toast.error('Error al eliminar comisionista');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  return (
    <div className="space-y-6" data-testid="comisionistas-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-secondary text-4xl md:text-5xl font-black uppercase text-black tracking-tight">
            COMISIONISTAS
          </h1>
          <div className="h-1 w-32 tna-gradient mt-4"></div>
        </div>
        <Button
          data-testid="add-comisionista-button"
          onClick={() => setShowModal(true)}
          className="bg-white text-black hover:bg-zinc-200 rounded-sm font-bold uppercase tracking-wide font-secondary"
        >
          <Plus className="w-4 h-4 mr-2" />
          NUEVO COMISIONISTA
        </Button>
      </div>

      {/* Lista de Comisionistas */}
      <Card className="bg-white border-gray-200 rounded-sm">
        <CardContent className="p-0">
          {/* Header de la lista */}
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 grid grid-cols-12 gap-4 text-xs text-gray-500 font-primary uppercase">
            <div className="col-span-3">Nombre</div>
            <div className="col-span-2">Email</div>
            <div className="col-span-1 text-center">Ventas</div>
            <div className="col-span-2 text-right">Monto Total</div>
            <div className="col-span-2 text-right">Comisión</div>
            <div className="col-span-2 text-right">Acciones</div>
          </div>
          
          {/* Filas de comisionistas */}
          <div className="divide-y divide-gray-100">
            {comisionistas.map((com) => {
              const comStats = stats[com.id] || {};
              return (
                <div key={com.id} className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-gray-50 transition-colors">
                  {/* Nombre */}
                  <div className="col-span-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="font-secondary font-bold text-gray-600">
                          {com.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-primary font-medium text-black">{com.name}</span>
                    </div>
                  </div>
                  
                  {/* Email */}
                  <div className="col-span-2">
                    <span className="text-gray-500 text-sm font-primary">{com.email}</span>
                  </div>
                  
                  {/* Total Ventas */}
                  <div className="col-span-1 text-center">
                    <span className="font-primary font-medium text-black">{comStats.total_sales || 0}</span>
                  </div>
                  
                  {/* Monto Total */}
                  <div className="col-span-2 text-right">
                    <span className="font-primary font-medium text-black">{formatCurrency(comStats.total_amount || 0)}</span>
                  </div>
                  
                  {/* Comisión */}
                  <div className="col-span-2 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-primary font-bold text-[#00E5FF]">{formatCurrency(comStats.total_commission || 0)}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[#FF8A00] font-primary">
                          Pend: {formatCurrency(comStats.pending_commission || 0)}
                        </span>
                        <span className="text-green-500 font-primary">
                          Pag: {formatCurrency(comStats.paid_commission || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Acciones */}
                  <div className="col-span-2 flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirm(com)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {comisionistas.length === 0 && (
        <Card className="bg-white border-gray-200 rounded-sm">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 font-primary">No hay comisionistas registrados</p>
          </CardContent>
        </Card>
      )}

      {/* Modal de nuevo comisionista */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-white border-gray-200 text-black">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl text-black">NUEVO COMISIONISTA</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label className="text-black font-primary font-medium">Nombre completo</Label>
              <Input
                data-testid="comisionista-name-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-white border-gray-300 text-black"
                required
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Email</Label>
              <Input
                data-testid="comisionista-email-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-white border-gray-300 text-black"
                required
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Contraseña</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="bg-white border-gray-300 text-black"
                required
              />
            </div>
            <Button
              data-testid="submit-comisionista-button"
              type="submit"
              className="w-full bg-black text-white hover:bg-gray-800 rounded-sm font-bold uppercase tracking-wide font-secondary"
            >
              CREAR COMISIONISTA
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-white border-gray-200 text-black max-w-md">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl text-black flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              ELIMINAR COMISIONISTA
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="font-primary text-gray-600">
              ¿Estás seguro de que deseas eliminar a <strong>{deleteConfirm?.name}</strong>? 
              Esta acción no se puede deshacer.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="font-secondary uppercase"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => handleDelete(deleteConfirm?.id)}
              className="bg-red-600 hover:bg-red-700 text-white font-secondary uppercase"
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
