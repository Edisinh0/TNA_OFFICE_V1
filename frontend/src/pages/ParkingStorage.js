import { useState, useEffect } from 'react';
import apiClient from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { 
  Plus, 
  Car, 
  Package, 
  Edit, 
  Trash2, 
  Building2,
  Search,
  X
} from 'lucide-react';
import { toast } from 'sonner';

export const ParkingStorage = () => {
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  const [form, setForm] = useState({
    type: 'parking',
    number: '',
    location: '',
    client_id: '',
    billed_value_uf: 0,
    cost_uf: 0,
    sale_value_uf: 0,
    notes: '',
    status: 'available'
  });

  const [newClientForm, setNewClientForm] = useState({
    company_name: '',
    rut: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, clientsRes] = await Promise.all([
        apiClient.get('/parking-storage'),
        apiClient.get('/clients')
      ]);
      setItems(itemsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await apiClient.put(`/parking-storage/${editingItem.id}`, form);
        toast.success('Elemento actualizado');
      } else {
        await apiClient.post('/parking-storage', form);
        toast.success('Elemento creado');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este elemento?')) return;
    try {
      await apiClient.delete(`/parking-storage/${id}`);
      toast.success('Elemento eliminado');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/clients', {
        ...newClientForm,
        contacts: [],
        documents: []
      });
      toast.success('Cliente creado');
      setClients([...clients, response.data]);
      setForm({ ...form, client_id: response.data.id });
      setShowNewClientModal(false);
      setNewClientForm({ company_name: '', rut: '', notes: '' });
    } catch (error) {
      toast.error('Error al crear cliente');
    }
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      type: item.type,
      number: item.number,
      location: item.location,
      client_id: item.client_id || '',
      billed_value_uf: item.billed_value_uf,
      cost_uf: item.cost_uf,
      sale_value_uf: item.sale_value_uf,
      notes: item.notes || '',
      status: item.status || 'available'
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setForm({
      type: 'parking',
      number: '',
      location: '',
      client_id: '',
      billed_value_uf: 0,
      cost_uf: 0,
      sale_value_uf: 0,
      notes: '',
      status: 'available'
    });
  };

  // Filtrar items
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.client_name && item.client_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  // Estadísticas
  const parkingCount = items.filter(i => i.type === 'parking').length;
  const storageCount = items.filter(i => i.type === 'storage').length;
  const occupiedCount = items.filter(i => i.status === 'occupied').length;
  const totalBilled = items.reduce((sum, i) => sum + (i.billed_value_uf || 0), 0);
  const totalCost = items.reduce((sum, i) => sum + (i.cost_uf || 0), 0);
  const totalSale = items.reduce((sum, i) => sum + (i.sale_value_uf || 0), 0);
  const totalMargin = totalBilled - totalCost; // Rentabilidad = Facturado - Costo
  const potentialRevenue = items.filter(i => i.status === 'occupied').reduce((sum, i) => sum + (i.sale_value_uf || 0), 0);
  
  // Valor UF aproximado (actualizar según corresponda)
  const UFValue = 38500; // Valor UF en pesos chilenos
  const totalMarginCLP = totalMargin * UFValue;
  const potentialRevenueCLP = potentialRevenue * UFValue;
  
  // Formatear pesos chilenos
  const formatCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black font-secondary uppercase">
            Estacionamientos y Bodegas
          </h1>
          <p className="text-gray-500 font-primary mt-1">
            Administra los arriendos de estacionamientos y bodegas
          </p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-black text-white hover:bg-gray-800 rounded-sm font-secondary uppercase"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Car className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-black font-primary">{parkingCount}</p>
                <p className="text-xs text-gray-500 font-primary">Estacionamientos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-black font-primary">{storageCount}</p>
                <p className="text-xs text-gray-500 font-primary">Bodegas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Building2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-black font-primary">{occupiedCount}</p>
                <p className="text-xs text-gray-500 font-primary">Arrendados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-purple-600 font-bold text-sm">UF</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-black font-primary">{totalBilled.toFixed(2)}</p>
                <p className="text-xs text-gray-500 font-primary">Total Facturado</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rentabilidad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={`border-2 ${totalMargin >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-secondary uppercase text-gray-600 mb-1">Rentabilidad</p>
                <div className="flex items-baseline gap-3">
                  <p className={`text-3xl font-bold font-primary ${totalMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {totalMargin.toFixed(2)} UF
                  </p>
                  <p className={`text-lg font-semibold font-primary ${totalMargin >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {formatCLP(totalMarginCLP)}
                  </p>
                </div>
                <p className="text-xs text-gray-500 font-primary mt-1">Facturado - Costo (UF {UFValue.toLocaleString('es-CL')})</p>
              </div>
              <div className={`p-3 rounded-full ${totalMargin >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                <span className={`text-2xl font-bold ${totalMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {totalMargin >= 0 ? '↑' : '↓'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-2 border-amber-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-secondary uppercase text-gray-600 mb-1">Venta Potencial (Arrendados)</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-3xl font-bold text-amber-600 font-primary">
                    {potentialRevenue.toFixed(2)} UF
                  </p>
                  <p className="text-lg font-semibold text-amber-500 font-primary">
                    {formatCLP(potentialRevenueCLP)}
                  </p>
                </div>
                <p className="text-xs text-gray-500 font-primary mt-1">Suma de valores de venta de espacios arrendados</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-full">
                <span className="text-2xl font-bold text-amber-600">$</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="bg-white border-gray-200">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por número, ubicación o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterType('all')}
                className={filterType === 'all' ? 'bg-black text-white' : ''}
              >
                Todos
              </Button>
              <Button
                variant={filterType === 'parking' ? 'default' : 'outline'}
                onClick={() => setFilterType('parking')}
                className={filterType === 'parking' ? 'bg-blue-600 text-white' : ''}
              >
                <Car className="w-4 h-4 mr-1" />
                Estacionamientos
              </Button>
              <Button
                variant={filterType === 'storage' ? 'default' : 'outline'}
                onClick={() => setFilterType('storage')}
                className={filterType === 'storage' ? 'bg-orange-600 text-white' : ''}
              >
                <Package className="w-4 h-4 mr-1" />
                Bodegas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="font-secondary uppercase text-black text-sm">
            LISTADO ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-4 font-secondary text-xs uppercase text-gray-600">Tipo</th>
                  <th className="text-left p-4 font-secondary text-xs uppercase text-gray-600">Número</th>
                  <th className="text-left p-4 font-secondary text-xs uppercase text-gray-600">Ubicación</th>
                  <th className="text-left p-4 font-secondary text-xs uppercase text-gray-600">Cliente</th>
                  <th className="text-right p-4 font-secondary text-xs uppercase text-gray-600">Facturado UF</th>
                  <th className="text-right p-4 font-secondary text-xs uppercase text-gray-600">Costo UF</th>
                  <th className="text-right p-4 font-secondary text-xs uppercase text-gray-600">Venta UF</th>
                  <th className="text-right p-4 font-secondary text-xs uppercase text-gray-600">Margen UF</th>
                  <th className="text-left p-4 font-secondary text-xs uppercase text-gray-600">Estado</th>
                  <th className="text-right p-4 font-secondary text-xs uppercase text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {item.type === 'parking' ? (
                          <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-primary">
                            <Car className="w-3 h-3" />
                            Estacionamiento
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-primary">
                            <Package className="w-3 h-3" />
                            Bodega
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-primary font-bold text-black">{item.number}</td>
                    <td className="p-4 font-primary text-gray-600">{item.location}</td>
                    <td className="p-4 font-primary text-gray-700">
                      {item.client_name || <span className="text-gray-400 italic">Sin asignar</span>}
                    </td>
                    <td className="p-4 text-right font-primary font-bold text-green-600">{(item.billed_value_uf || 0).toFixed(2)}</td>
                    <td className="p-4 text-right font-primary text-gray-600">{(item.cost_uf || 0).toFixed(2)}</td>
                    <td className="p-4 text-right font-primary text-orange-600">{(item.sale_value_uf || 0).toFixed(2)}</td>
                    <td className={`p-4 text-right font-primary font-bold ${((item.billed_value_uf || 0) - (item.cost_uf || 0)) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {((item.billed_value_uf || 0) - (item.cost_uf || 0)).toFixed(2)}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-primary ${
                        item.status === 'occupied' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {item.status === 'occupied' ? 'Arrendado' : 'Disponible'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(item)}
                          className="border-gray-300"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan="10" className="p-8 text-center text-gray-500 font-primary">
                      No hay elementos registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Crear/Editar */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-white border-gray-200 text-black max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl text-black">
              {editingItem ? 'EDITAR' : 'NUEVO'} ESTACIONAMIENTO / BODEGA
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-black font-primary font-medium">Tipo</Label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-sm bg-white text-black"
                  required
                >
                  <option value="parking">Estacionamiento</option>
                  <option value="storage">Bodega</option>
                </select>
              </div>
              <div>
                <Label className="text-black font-primary font-medium">Número</Label>
                <Input
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  className="bg-white border-gray-300 text-black"
                  placeholder="Ej: E-01, B-15"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-black font-primary font-medium">Ubicación</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="bg-white border-gray-300 text-black"
                placeholder="Ej: Subterráneo Nivel -1"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-black font-primary font-medium">Cliente</Label>
                <div className="flex gap-2">
                  <select
                    value={form.client_id}
                    onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                    className="flex-1 p-2 border border-gray-300 rounded-sm bg-white text-black"
                  >
                    <option value="">Sin asignar</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.company_name}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    onClick={() => setShowNewClientModal(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    title="Crear nuevo cliente"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-black font-primary font-medium">Estado</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-sm bg-white text-black"
                >
                  <option value="available">Disponible</option>
                  <option value="occupied">Arrendado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-black font-primary font-medium">Valor Facturado (UF)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.billed_value_uf}
                  onChange={(e) => setForm({ ...form, billed_value_uf: parseFloat(e.target.value) || 0 })}
                  className="bg-white border-gray-300 text-black"
                />
              </div>
              <div>
                <Label className="text-black font-primary font-medium">Costo (UF)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.cost_uf}
                  onChange={(e) => setForm({ ...form, cost_uf: parseFloat(e.target.value) || 0 })}
                  className="bg-white border-gray-300 text-black"
                />
              </div>
              <div>
                <Label className="text-black font-primary font-medium">Valor de Venta (UF)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.sale_value_uf}
                  onChange={(e) => setForm({ ...form, sale_value_uf: parseFloat(e.target.value) || 0 })}
                  className="bg-white border-gray-300 text-black"
                />
              </div>
            </div>

            <div>
              <Label className="text-black font-primary font-medium">Notas</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="bg-white border-gray-300 text-black"
                placeholder="Observaciones adicionales..."
                rows={2}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-black text-white hover:bg-gray-800 rounded-sm font-bold uppercase tracking-wide font-secondary"
            >
              {editingItem ? 'GUARDAR CAMBIOS' : 'CREAR'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Nuevo Cliente */}
      <Dialog open={showNewClientModal} onOpenChange={setShowNewClientModal}>
        <DialogContent className="bg-white border-gray-200 text-black">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl text-black">
              NUEVO CLIENTE
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateClient} className="space-y-4 mt-4">
            <div>
              <Label className="text-black font-primary font-medium">Nombre de Empresa</Label>
              <Input
                value={newClientForm.company_name}
                onChange={(e) => setNewClientForm({ ...newClientForm, company_name: e.target.value })}
                className="bg-white border-gray-300 text-black"
                required
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">RUT</Label>
              <Input
                value={newClientForm.rut}
                onChange={(e) => setNewClientForm({ ...newClientForm, rut: e.target.value })}
                className="bg-white border-gray-300 text-black"
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Notas</Label>
              <Textarea
                value={newClientForm.notes}
                onChange={(e) => setNewClientForm({ ...newClientForm, notes: e.target.value })}
                className="bg-white border-gray-300 text-black"
                rows={2}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-orange-500 text-white hover:bg-orange-600 rounded-sm font-bold uppercase tracking-wide font-secondary"
            >
              CREAR CLIENTE
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
