import { useState, useEffect } from 'react';
import apiClient from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  X,
  Settings,
  FileText,
  Building2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export const MonthlyServices = () => {
  // State para contratos de servicios
  const [contracts, setContracts] = useState([]);
  // State para catálogo de servicios
  const [catalog, setCatalog] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [showContractModal, setShowContractModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  
  const [editingContract, setEditingContract] = useState(null);
  const [editingCatalogItem, setEditingCatalogItem] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('contracts');
  
  // Form para contratos
  const [contractForm, setContractForm] = useState({
    service_id: '',
    service_name: '',
    category: '',
    client_id: '',
    billed_value_uf: 0,
    cost_uf: 0,
    sale_value_uf: 0,
    notes: '',
    status: 'active'
  });

  // Form para catálogo
  const [catalogForm, setCatalogForm] = useState({
    name: '',
    category: '',
    cost_uf: 0,
    sale_value_uf: 0,
    description: ''
  });

  // Form para nuevo cliente
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
      const [contractsRes, catalogRes, clientsRes] = await Promise.all([
        apiClient.get('/monthly-services'),
        apiClient.get('/monthly-services-catalog'),
        apiClient.get('/clients')
      ]);
      setContracts(contractsRes.data);
      setCatalog(catalogRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // ==== CONTRATOS ====
  const handleContractSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingContract) {
        await apiClient.put(`/monthly-services/${editingContract.id}`, contractForm);
        toast.success('Servicio actualizado');
      } else {
        await apiClient.post('/monthly-services', contractForm);
        toast.success('Servicio contratado');
      }
      setShowContractModal(false);
      resetContractForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    }
  };

  const handleDeleteContract = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este servicio contratado?')) return;
    try {
      await apiClient.delete(`/monthly-services/${id}`);
      toast.success('Servicio eliminado');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const openEditContract = (contract) => {
    setEditingContract(contract);
    setContractForm({
      service_id: contract.service_id || '',
      service_name: contract.service_name,
      category: contract.category || '',
      client_id: contract.client_id || '',
      billed_value_uf: contract.billed_value_uf,
      cost_uf: contract.cost_uf,
      sale_value_uf: contract.sale_value_uf,
      notes: contract.notes || '',
      status: contract.status || 'active'
    });
    setShowContractModal(true);
  };

  const resetContractForm = () => {
    setEditingContract(null);
    setContractForm({
      service_id: '',
      service_name: '',
      category: '',
      client_id: '',
      billed_value_uf: 0,
      cost_uf: 0,
      sale_value_uf: 0,
      notes: '',
      status: 'active'
    });
  };

  // Cuando se selecciona un servicio del catálogo, auto-llenar campos
  const handleServiceSelect = (serviceId) => {
    const service = catalog.find(s => s.id === serviceId);
    if (service) {
      setContractForm({
        ...contractForm,
        service_id: serviceId,
        service_name: service.name,
        category: service.category,
        cost_uf: service.cost_uf,
        sale_value_uf: service.sale_value_uf
      });
    } else {
      setContractForm({
        ...contractForm,
        service_id: '',
        service_name: '',
        category: ''
      });
    }
  };

  // ==== CATÁLOGO ====
  const handleCatalogSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCatalogItem) {
        await apiClient.put(`/monthly-services-catalog/${editingCatalogItem.id}`, catalogForm);
        toast.success('Servicio del catálogo actualizado');
      } else {
        await apiClient.post('/monthly-services-catalog', catalogForm);
        toast.success('Servicio agregado al catálogo');
      }
      setShowCatalogModal(false);
      resetCatalogForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    }
  };

  const handleDeleteCatalogItem = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este servicio del catálogo?')) return;
    try {
      await apiClient.delete(`/monthly-services-catalog/${id}`);
      toast.success('Servicio eliminado del catálogo');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const openEditCatalogItem = (item) => {
    setEditingCatalogItem(item);
    setCatalogForm({
      name: item.name,
      category: item.category,
      cost_uf: item.cost_uf,
      sale_value_uf: item.sale_value_uf,
      description: item.description || ''
    });
    setShowCatalogModal(true);
  };

  const resetCatalogForm = () => {
    setEditingCatalogItem(null);
    setCatalogForm({
      name: '',
      category: '',
      cost_uf: 0,
      sale_value_uf: 0,
      description: ''
    });
  };

  // ==== NUEVO CLIENTE ====
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
      setContractForm({ ...contractForm, client_id: response.data.id });
      setShowNewClientModal(false);
      setNewClientForm({ company_name: '', rut: '', notes: '' });
    } catch (error) {
      toast.error('Error al crear cliente');
    }
  };

  // Filtrar contratos
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = 
      contract.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contract.client_name && contract.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (contract.category && contract.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || contract.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Filtrar catálogo
  const filteredCatalog = catalog.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estadísticas
  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const totalBilled = contracts.filter(c => c.status === 'active').reduce((sum, c) => sum + (c.billed_value_uf || 0), 0);
  const totalCost = contracts.filter(c => c.status === 'active').reduce((sum, c) => sum + (c.cost_uf || 0), 0);
  const catalogCount = catalog.length;

  // Obtener categorías únicas del catálogo
  const uniqueCategories = [...new Set(catalog.map(s => s.category).filter(Boolean))];

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black font-secondary uppercase">
            Servicios Mensuales
          </h1>
          <p className="text-gray-500 font-primary mt-1">
            Administra los servicios mensuales contratados por clientes
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-black font-primary">{activeContracts}</p>
                <p className="text-xs text-gray-500 font-primary">Servicios Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-green-600 font-bold text-sm">UF</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-black font-primary">{totalBilled.toFixed(2)}</p>
                <p className="text-xs text-gray-500 font-primary">Total Facturado</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-orange-600 font-bold text-sm">UF</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-black font-primary">{totalCost.toFixed(2)}</p>
                <p className="text-xs text-gray-500 font-primary">Total Costo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Settings className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-black font-primary">{catalogCount}</p>
                <p className="text-xs text-gray-500 font-primary">Servicios en Catálogo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="contracts" className="data-[state=active]:bg-white">
              <FileText className="w-4 h-4 mr-2" />
              Servicios Contratados
            </TabsTrigger>
            <TabsTrigger value="catalog" className="data-[state=active]:bg-white">
              <Settings className="w-4 h-4 mr-2" />
              Catálogo de Servicios
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            {activeTab === 'contracts' && (
              <Button
                onClick={() => { resetContractForm(); setShowContractModal(true); }}
                className="bg-black text-white hover:bg-gray-800 rounded-sm font-secondary uppercase"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Servicio
              </Button>
            )}
            {activeTab === 'catalog' && (
              <Button
                onClick={() => { resetCatalogForm(); setShowCatalogModal(true); }}
                className="bg-purple-600 text-white hover:bg-purple-700 rounded-sm font-secondary uppercase"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar al Catálogo
              </Button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <Card className="bg-white border-gray-200 mb-4">
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={activeTab === 'contracts' ? "Buscar por servicio, cliente o categoría..." : "Buscar en catálogo..."}
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
              {activeTab === 'contracts' && (
                <div className="flex gap-2">
                  <Button
                    variant={filterStatus === 'all' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('all')}
                    className={filterStatus === 'all' ? 'bg-black text-white' : ''}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={filterStatus === 'active' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('active')}
                    className={filterStatus === 'active' ? 'bg-green-600 text-white' : ''}
                  >
                    Activos
                  </Button>
                  <Button
                    variant={filterStatus === 'inactive' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('inactive')}
                    className={filterStatus === 'inactive' ? 'bg-gray-600 text-white' : ''}
                  >
                    Inactivos
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tab: Servicios Contratados */}
        <TabsContent value="contracts">
          <Card className="bg-white border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="font-secondary uppercase text-black text-sm">
                SERVICIOS CONTRATADOS ({filteredContracts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left p-4 font-secondary text-xs uppercase text-gray-600">Servicio</th>
                      <th className="text-left p-4 font-secondary text-xs uppercase text-gray-600">Categoría</th>
                      <th className="text-left p-4 font-secondary text-xs uppercase text-gray-600">Cliente</th>
                      <th className="text-right p-4 font-secondary text-xs uppercase text-gray-600">Facturado UF</th>
                      <th className="text-right p-4 font-secondary text-xs uppercase text-gray-600">Costo UF</th>
                      <th className="text-right p-4 font-secondary text-xs uppercase text-gray-600">Venta UF</th>
                      <th className="text-left p-4 font-secondary text-xs uppercase text-gray-600">Estado</th>
                      <th className="text-right p-4 font-secondary text-xs uppercase text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.map((contract) => (
                      <tr key={contract.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4">
                          <div className="font-primary font-bold text-black">{contract.service_name}</div>
                          {contract.notes && (
                            <div className="text-xs text-gray-500 mt-1 truncate max-w-[200px]" title={contract.notes}>
                              {contract.notes}
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-primary text-gray-600">
                          {contract.category || <span className="text-gray-400 italic">Sin categoría</span>}
                        </td>
                        <td className="p-4 font-primary text-gray-700">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            {contract.client_name || <span className="text-gray-400 italic">Sin asignar</span>}
                          </div>
                        </td>
                        <td className="p-4 text-right font-primary font-bold text-green-600">{contract.billed_value_uf.toFixed(2)}</td>
                        <td className="p-4 text-right font-primary text-gray-600">{contract.cost_uf.toFixed(2)}</td>
                        <td className="p-4 text-right font-primary text-orange-600">{contract.sale_value_uf.toFixed(2)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-primary ${
                            contract.status === 'active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {contract.status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditContract(contract)}
                              className="border-gray-300"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteContract(contract.id)}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredContracts.length === 0 && (
                      <tr>
                        <td colSpan="8" className="p-8 text-center text-gray-500 font-primary">
                          No hay servicios contratados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Catálogo de Servicios */}
        <TabsContent value="catalog">
          <Card className="bg-white border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="font-secondary uppercase text-black text-sm">
                CATÁLOGO DE SERVICIOS ({filteredCatalog.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left p-4 font-secondary text-xs uppercase text-gray-600">Nombre del Servicio</th>
                      <th className="text-left p-4 font-secondary text-xs uppercase text-gray-600">Categoría</th>
                      <th className="text-left p-4 font-secondary text-xs uppercase text-gray-600">Descripción</th>
                      <th className="text-right p-4 font-secondary text-xs uppercase text-gray-600">Costo UF</th>
                      <th className="text-right p-4 font-secondary text-xs uppercase text-gray-600">Valor Venta UF</th>
                      <th className="text-right p-4 font-secondary text-xs uppercase text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCatalog.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 font-primary font-bold text-black">{item.name}</td>
                        <td className="p-4 font-primary text-gray-600">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-4 font-primary text-gray-500 text-sm max-w-[200px] truncate" title={item.description}>
                          {item.description || <span className="italic text-gray-400">Sin descripción</span>}
                        </td>
                        <td className="p-4 text-right font-primary text-gray-600">{item.cost_uf.toFixed(2)}</td>
                        <td className="p-4 text-right font-primary font-bold text-orange-600">{item.sale_value_uf.toFixed(2)}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditCatalogItem(item)}
                              className="border-gray-300"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCatalogItem(item.id)}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredCatalog.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-gray-500 font-primary">
                          No hay servicios en el catálogo
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Crear/Editar Contrato */}
      <Dialog open={showContractModal} onOpenChange={setShowContractModal}>
        <DialogContent className="bg-white border-gray-200 text-black sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl text-black">
              {editingContract ? 'EDITAR' : 'NUEVO'} SERVICIO MENSUAL
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleContractSubmit} className="space-y-3 mt-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-black font-primary font-medium">Seleccionar del Catálogo</Label>
                <button
                  type="button"
                  onClick={() => { setActiveTab('catalog'); setShowContractModal(false); setShowCatalogModal(true); }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Administrar catálogo
                </button>
              </div>
              <select
                value={contractForm.service_id}
                onChange={(e) => handleServiceSelect(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-sm bg-white text-black"
              >
                <option value="">-- Escribir manualmente --</option>
                {catalog.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name} - {service.sale_value_uf.toFixed(2)} UF
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-black font-primary font-medium">Nombre del Servicio *</Label>
                <Input
                  value={contractForm.service_name}
                  onChange={(e) => setContractForm({ ...contractForm, service_name: e.target.value })}
                  className="bg-white border-gray-300 text-black"
                  placeholder="Ej: Contestación Telefónica"
                  required
                />
              </div>
              <div>
                <Label className="text-black font-primary font-medium">Categoría</Label>
                <Input
                  value={contractForm.category}
                  onChange={(e) => setContractForm({ ...contractForm, category: e.target.value })}
                  className="bg-white border-gray-300 text-black"
                  placeholder="Ej: Servicios Telefónicos"
                  list="categories-list"
                />
                <datalist id="categories-list">
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-black font-primary font-medium">Cliente</Label>
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(true)}
                  className="text-xs text-orange-600 hover:underline"
                >
                  + Nuevo cliente
                </button>
              </div>
              <select
                value={contractForm.client_id}
                onChange={(e) => setContractForm({ ...contractForm, client_id: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-sm bg-white text-black"
              >
                <option value="">Sin asignar</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.company_name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-black font-primary font-medium">Facturado (UF)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={contractForm.billed_value_uf}
                  onChange={(e) => setContractForm({ ...contractForm, billed_value_uf: parseFloat(e.target.value) || 0 })}
                  className="bg-white border-gray-300 text-black"
                />
              </div>
              <div>
                <Label className="text-black font-primary font-medium">Costo (UF)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={contractForm.cost_uf}
                  onChange={(e) => setContractForm({ ...contractForm, cost_uf: parseFloat(e.target.value) || 0 })}
                  className="bg-white border-gray-300 text-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-black font-primary font-medium">Venta (UF)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={contractForm.sale_value_uf}
                  onChange={(e) => setContractForm({ ...contractForm, sale_value_uf: parseFloat(e.target.value) || 0 })}
                  className="bg-white border-gray-300 text-black"
                />
              </div>
              <div>
                <Label className="text-black font-primary font-medium">Estado</Label>
                <select
                  value={contractForm.status}
                  onChange={(e) => setContractForm({ ...contractForm, status: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-sm bg-white text-black h-10"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-black font-primary font-medium">Notas</Label>
              <Textarea
                value={contractForm.notes}
                onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })}
                className="bg-white border-gray-300 text-black"
                placeholder="Observaciones adicionales..."
                rows={2}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-black text-white hover:bg-gray-800 rounded-sm font-bold uppercase tracking-wide font-secondary"
            >
              {editingContract ? 'GUARDAR CAMBIOS' : 'CREAR SERVICIO'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Crear/Editar Catálogo */}
      <Dialog open={showCatalogModal} onOpenChange={setShowCatalogModal}>
        <DialogContent className="bg-white border-gray-200 text-black max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl text-black">
              {editingCatalogItem ? 'EDITAR' : 'AGREGAR'} SERVICIO AL CATÁLOGO
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCatalogSubmit} className="space-y-4 mt-4">
            <div>
              <Label className="text-black font-primary font-medium">Nombre del Servicio *</Label>
              <Input
                value={catalogForm.name}
                onChange={(e) => setCatalogForm({ ...catalogForm, name: e.target.value })}
                className="bg-white border-gray-300 text-black"
                placeholder="Ej: Contestación Telefónica Personalizada y Asistida"
                required
              />
            </div>

            <div>
              <Label className="text-black font-primary font-medium">Categoría *</Label>
              <Input
                value={catalogForm.category}
                onChange={(e) => setCatalogForm({ ...catalogForm, category: e.target.value })}
                className="bg-white border-gray-300 text-black"
                placeholder="Ej: Servicios Telefónicos"
                list="catalog-categories-list"
                required
              />
              <datalist id="catalog-categories-list">
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-black font-primary font-medium">Costo (UF)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={catalogForm.cost_uf}
                  onChange={(e) => setCatalogForm({ ...catalogForm, cost_uf: parseFloat(e.target.value) || 0 })}
                  className="bg-white border-gray-300 text-black"
                />
              </div>
              <div>
                <Label className="text-black font-primary font-medium">Valor de Venta (UF)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={catalogForm.sale_value_uf}
                  onChange={(e) => setCatalogForm({ ...catalogForm, sale_value_uf: parseFloat(e.target.value) || 0 })}
                  className="bg-white border-gray-300 text-black"
                />
              </div>
            </div>

            <div>
              <Label className="text-black font-primary font-medium">Descripción</Label>
              <Textarea
                value={catalogForm.description}
                onChange={(e) => setCatalogForm({ ...catalogForm, description: e.target.value })}
                className="bg-white border-gray-300 text-black"
                placeholder="Descripción del servicio..."
                rows={3}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-purple-600 text-white hover:bg-purple-700 rounded-sm font-bold uppercase tracking-wide font-secondary"
            >
              {editingCatalogItem ? 'GUARDAR CAMBIOS' : 'AGREGAR AL CATÁLOGO'}
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
