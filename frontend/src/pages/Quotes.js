import { useState, useEffect, useCallback, memo } from 'react';
import apiClient from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { 
  FileText, Eye, Trash2, Building2, Users, Maximize2, DollarSign, Upload, X, Edit, User, Plus, 
  Car, Package, RefreshCw, Briefcase, Search, Check, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

// Componente separado para cada servicio único (evita re-renders)
const OtherServiceItem = memo(({ service, onUpdate, onRemove }) => {
  return (
    <div className="bg-gray-50 p-3 rounded-sm space-y-2">
      <div className="flex items-center justify-between">
        <Input
          value={service.name}
          onChange={(e) => onUpdate(service._tempId, 'name', e.target.value)}
          placeholder="Nombre del servicio"
          className="flex-1 h-8 text-sm"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(service._tempId)}
          className="text-red-500 hover:text-red-700 ml-2"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      <Input
        value={service.description}
        onChange={(e) => onUpdate(service._tempId, 'description', e.target.value)}
        placeholder="Descripción (opcional)"
        className="h-8 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-gray-500">Valor Venta (UF)</Label>
          <Input
            type="number"
            value={service.sale_value_uf}
            onChange={(e) => onUpdate(service._tempId, 'sale_value_uf', e.target.value)}
            className="h-8 text-sm"
            step="0.01"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Costo (UF)</Label>
          <Input
            type="number"
            value={service.cost_uf}
            onChange={(e) => onUpdate(service._tempId, 'cost_uf', e.target.value)}
            className="h-8 text-sm"
            step="0.01"
          />
        </div>
      </div>
    </div>
  );
});

OtherServiceItem.displayName = 'OtherServiceItem';

export const Quotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);
  
  // Datos disponibles para cotización
  const [offices, setOffices] = useState([]);
  const [parkingStorage, setParkingStorage] = useState([]);
  const [monthlyServices, setMonthlyServices] = useState([]);
  
  // Estados del formulario de creación/edición
  const [formData, setFormData] = useState({
    client_name: '',
    notes: '',
    selectedOffices: [],
    selectedParkingStorage: [],
    selectedMonthlyServices: [],
    otherServices: []
  });
  
  // Estados de búsqueda
  const [officeSearch, setOfficeSearch] = useState('');
  const [psSearch, setPsSearch] = useState('');
  const [msSearch, setMsSearch] = useState('');
  
  // Estados de expansión de secciones
  const [expandedSections, setExpandedSections] = useState({
    offices: true,
    parkingStorage: false,
    monthlyServices: false,
    otherServices: false
  });

  useEffect(() => {
    loadQuotes();
    loadAvailableItems();
  }, []);

  const loadQuotes = async () => {
    try {
      const response = await apiClient.get('/quotes');
      setQuotes(response.data);
    } catch (error) {
      toast.error('Error al cargar cotizaciones');
    }
  };

  const loadAvailableItems = async () => {
    try {
      const [officesRes, psRes, msRes] = await Promise.all([
        apiClient.get('/offices'),
        apiClient.get('/parking-storage'),
        apiClient.get('/monthly-services-catalog')
      ]);
      setOffices(officesRes.data);
      setParkingStorage(psRes.data);
      setMonthlyServices(msRes.data);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const handleDelete = async (quoteId) => {
    if (!window.confirm('¿Eliminar esta cotización?')) return;
    try {
      await apiClient.delete(`/quotes/${quoteId}`);
      toast.success('Cotización eliminada');
      loadQuotes();
    } catch (error) {
      toast.error('Error al eliminar cotización');
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: '',
      notes: '',
      selectedOffices: [],
      selectedParkingStorage: [],
      selectedMonthlyServices: [],
      otherServices: []
    });
    setOfficeSearch('');
    setPsSearch('');
    setMsSearch('');
  };

  const handleCreateQuote = async () => {
    setSavingChanges(true);
    try {
      const payload = {
        client_name: formData.client_name,
        notes: formData.notes,
        office_ids: formData.selectedOffices.map(o => o.id),
        parking_storage_ids: formData.selectedParkingStorage.map(ps => ps.id),
        monthly_service_ids: formData.selectedMonthlyServices.map(ms => ms.id),
        other_services: formData.otherServices
      };
      
      await apiClient.post('/quotes', payload);
      toast.success('Cotización creada exitosamente');
      setShowCreateModal(false);
      resetForm();
      loadQuotes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear cotización');
    } finally {
      setSavingChanges(false);
    }
  };

  const handleEditQuote = (quote) => {
    setSelectedQuote(quote);
    setFormData({
      client_name: quote.client_name || '',
      notes: quote.notes || '',
      selectedOffices: quote.offices?.map(o => ({
        id: o.office_id,
        office_number: o.office_number,
        location: o.location,
        square_meters: o.square_meters,
        capacity: o.capacity,
        sale_value_uf: o.sale_value_uf,
        cost_uf: o.cost_uf
      })) || [],
      selectedParkingStorage: quote.parking_storage?.map(ps => ({
        id: ps.item_id,
        type: ps.type,
        number: ps.number,
        location: ps.location,
        sale_value_uf: ps.sale_value_uf,
        cost_uf: ps.cost_uf
      })) || [],
      selectedMonthlyServices: quote.monthly_services?.map(ms => ({
        id: ms.service_id,
        name: ms.service_name,
        category: ms.category,
        sale_value_uf: ms.sale_value_uf,
        cost_uf: ms.cost_uf
      })) || [],
      otherServices: (quote.other_services || []).map(os => ({
        ...os,
        _tempId: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      }))
    });
    setEditMode(true);
    setShowDetailModal(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedQuote) return;
    
    setSavingChanges(true);
    try {
      const payload = {
        client_name: formData.client_name,
        notes: formData.notes,
        status: selectedQuote.status,
        offices: formData.selectedOffices.map(o => ({
          office_id: o.id,
          office_number: o.office_number,
          location: o.location,
          square_meters: o.square_meters,
          capacity: o.capacity,
          sale_value_uf: o.sale_value_uf,
          cost_uf: o.cost_uf
        })),
        parking_storage: formData.selectedParkingStorage.map(ps => ({
          item_id: ps.id,
          type: ps.type,
          number: ps.number,
          location: ps.location,
          sale_value_uf: ps.sale_value_uf,
          cost_uf: ps.cost_uf
        })),
        monthly_services: formData.selectedMonthlyServices.map(ms => ({
          service_id: ms.id,
          service_name: ms.name,
          category: ms.category,
          sale_value_uf: ms.sale_value_uf,
          cost_uf: ms.cost_uf
        })),
        other_services: formData.otherServices
      };
      
      await apiClient.put(`/quotes/${selectedQuote.id}`, payload);
      toast.success('Cotización actualizada');
      
      const updatedQuote = await apiClient.get(`/quotes/${selectedQuote.id}`);
      setSelectedQuote(updatedQuote.data);
      setEditMode(false);
      loadQuotes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar cambios');
    } finally {
      setSavingChanges(false);
    }
  };

  const toggleItem = (item, type) => {
    const key = type === 'office' ? 'selectedOffices' : 
                type === 'ps' ? 'selectedParkingStorage' : 'selectedMonthlyServices';
    const idKey = type === 'office' ? 'id' : type === 'ps' ? 'id' : 'id';
    
    const exists = formData[key].find(i => i[idKey] === item.id);
    if (exists) {
      setFormData({
        ...formData,
        [key]: formData[key].filter(i => i[idKey] !== item.id)
      });
    } else {
      setFormData({
        ...formData,
        [key]: [...formData[key], item]
      });
    }
  };

  const addOtherService = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      otherServices: [...prev.otherServices, { 
        _tempId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: '', 
        description: '', 
        sale_value_uf: 0, 
        cost_uf: 0 
      }]
    }));
  }, []);

  const updateOtherService = useCallback((tempId, field, value) => {
    setFormData(prev => ({
      ...prev,
      otherServices: prev.otherServices.map(service => 
        service._tempId === tempId 
          ? { ...service, [field]: field.includes('uf') ? parseFloat(value) || 0 : value }
          : service
      )
    }));
  }, []);

  const removeOtherService = useCallback((tempId) => {
    setFormData(prev => ({
      ...prev,
      otherServices: prev.otherServices.filter(service => service._tempId !== tempId)
    }));
  }, []);

  const calculateTotals = () => {
    const officeSale = formData.selectedOffices.reduce((sum, o) => sum + (o.sale_value_uf || 0), 0);
    const officeCost = formData.selectedOffices.reduce((sum, o) => sum + (o.cost_uf || 0), 0);
    const psSale = formData.selectedParkingStorage.reduce((sum, ps) => sum + (ps.sale_value_uf || 0), 0);
    const psCost = formData.selectedParkingStorage.reduce((sum, ps) => sum + (ps.cost_uf || 0), 0);
    const msSale = formData.selectedMonthlyServices.reduce((sum, ms) => sum + (ms.sale_value_uf || 0), 0);
    const msCost = formData.selectedMonthlyServices.reduce((sum, ms) => sum + (ms.cost_uf || 0), 0);
    const osSale = formData.otherServices.reduce((sum, os) => sum + (os.sale_value_uf || 0), 0);
    const osCost = formData.otherServices.reduce((sum, os) => sum + (os.cost_uf || 0), 0);
    
    return {
      totalSale: officeSale + psSale + msSale + osSale,
      totalCost: officeCost + psCost + msCost + osCost,
      totalItems: formData.selectedOffices.length + formData.selectedParkingStorage.length + 
                  formData.selectedMonthlyServices.length + formData.otherServices.length
    };
  };

  const formatUF = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' UF';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pre-cotizacion': { text: 'Pre-Cotización', class: 'bg-yellow-100 text-yellow-700' },
      'enviada': { text: 'Enviada', class: 'bg-blue-100 text-blue-700' },
      'aprobada': { text: 'Aprobada', class: 'bg-green-100 text-green-700' },
      'rechazada': { text: 'Rechazada', class: 'bg-red-100 text-red-700' }
    };
    const badge = badges[status] || badges['pre-cotizacion'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.class}`}>
        {badge.text}
      </span>
    );
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Filtrar items
  const filteredOffices = offices.filter(o => 
    o.office_number.toLowerCase().includes(officeSearch.toLowerCase()) ||
    o.location.toLowerCase().includes(officeSearch.toLowerCase())
  );
  
  const filteredPS = parkingStorage.filter(ps =>
    ps.number.toLowerCase().includes(psSearch.toLowerCase()) ||
    ps.location.toLowerCase().includes(psSearch.toLowerCase())
  );
  
  const filteredMS = monthlyServices.filter(ms =>
    ms.name.toLowerCase().includes(msSearch.toLowerCase()) ||
    (ms.category && ms.category.toLowerCase().includes(msSearch.toLowerCase()))
  );

  const totals = calculateTotals();

  // JSX memoizado para selector de items (evita re-creación del componente)
  const itemSelectorJSX = (
    <div className="space-y-4">
      {/* Oficinas */}
      <div className="border border-gray-200 rounded-sm overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('offices')}
          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100"
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="font-secondary font-bold text-sm">OFICINAS</span>
            {formData.selectedOffices.length > 0 && (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                {formData.selectedOffices.length}
              </span>
            )}
          </div>
          {expandedSections.offices ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedSections.offices && (
          <div className="p-3 border-t border-gray-200">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={officeSearch}
                onChange={(e) => setOfficeSearch(e.target.value)}
                placeholder="Buscar oficina..."
                className="pl-9 h-8 text-sm"
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredOffices.map(office => {
                const isSelected = formData.selectedOffices.find(o => o.id === office.id);
                return (
                  <button
                    key={office.id}
                    type="button"
                    onClick={() => toggleItem(office, 'office')}
                    className={`w-full flex items-center justify-between p-2 rounded text-left text-sm ${
                      isSelected ? 'bg-blue-50 border border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                      <span className="font-medium">{office.office_number}</span>
                      <span className="text-gray-500">{office.location}</span>
                    </div>
                    <span className="text-green-600 font-medium">{formatUF(office.sale_value_uf)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Estacionamientos/Bodegas */}
      <div className="border border-gray-200 rounded-sm overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('parkingStorage')}
          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100"
        >
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-purple-600" />
            <span className="font-secondary font-bold text-sm">ESTACIONAMIENTOS / BODEGAS</span>
            {formData.selectedParkingStorage.length > 0 && (
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">
                {formData.selectedParkingStorage.length}
              </span>
            )}
          </div>
          {expandedSections.parkingStorage ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedSections.parkingStorage && (
          <div className="p-3 border-t border-gray-200">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={psSearch}
                onChange={(e) => setPsSearch(e.target.value)}
                placeholder="Buscar..."
                className="pl-9 h-8 text-sm"
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredPS.map(ps => {
                const isSelected = formData.selectedParkingStorage.find(p => p.id === ps.id);
                return (
                  <button
                    key={ps.id}
                    type="button"
                    onClick={() => toggleItem(ps, 'ps')}
                    className={`w-full flex items-center justify-between p-2 rounded text-left text-sm ${
                      isSelected ? 'bg-purple-50 border border-purple-300' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isSelected && <Check className="w-4 h-4 text-purple-600" />}
                      {ps.type === 'parking' ? <Car className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                      <span className="font-medium">{ps.number}</span>
                      <span className="text-gray-500 text-xs">{ps.type === 'parking' ? 'Estac.' : 'Bodega'}</span>
                    </div>
                    <span className="text-green-600 font-medium">{formatUF(ps.sale_value_uf)}</span>
                  </button>
                );
              })}
              {filteredPS.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No hay estacionamientos/bodegas disponibles</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Servicios Recurrentes */}
      <div className="border border-gray-200 rounded-sm overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('monthlyServices')}
          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100"
        >
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-orange-600" />
            <span className="font-secondary font-bold text-sm">SERVICIOS RECURRENTES</span>
            {formData.selectedMonthlyServices.length > 0 && (
              <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">
                {formData.selectedMonthlyServices.length}
              </span>
            )}
          </div>
          {expandedSections.monthlyServices ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedSections.monthlyServices && (
          <div className="p-3 border-t border-gray-200">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={msSearch}
                onChange={(e) => setMsSearch(e.target.value)}
                placeholder="Buscar servicio..."
                className="pl-9 h-8 text-sm"
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredMS.map(ms => {
                const isSelected = formData.selectedMonthlyServices.find(m => m.id === ms.id);
                return (
                  <button
                    key={ms.id}
                    type="button"
                    onClick={() => toggleItem(ms, 'ms')}
                    className={`w-full flex items-center justify-between p-2 rounded text-left text-sm ${
                      isSelected ? 'bg-orange-50 border border-orange-300' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isSelected && <Check className="w-4 h-4 text-orange-600" />}
                      <span className="font-medium">{ms.name}</span>
                      {ms.category && <span className="text-gray-500 text-xs">[{ms.category}]</span>}
                    </div>
                    <span className="text-green-600 font-medium">{formatUF(ms.sale_value_uf)}/mes</span>
                  </button>
                );
              })}
              {filteredMS.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No hay servicios recurrentes disponibles</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Otros Servicios Únicos */}
      <div className="border border-gray-200 rounded-sm overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('otherServices')}
          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100"
        >
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-teal-600" />
            <span className="font-secondary font-bold text-sm">OTROS SERVICIOS ÚNICOS</span>
            {formData.otherServices.length > 0 && (
              <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full text-xs">
                {formData.otherServices.length}
              </span>
            )}
          </div>
          {expandedSections.otherServices ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedSections.otherServices && (
          <div className="p-3 border-t border-gray-200 space-y-3">
            {formData.otherServices.map((service) => (
              <OtherServiceItem
                key={service._tempId}
                service={service}
                onUpdate={updateOtherService}
                onRemove={removeOtherService}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOtherService}
              className="w-full border-dashed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Servicio
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-secondary text-4xl md:text-5xl font-black uppercase text-black tracking-tight">
            COTIZACIONES
          </h1>
          <div className="h-1 w-32 tna-gradient mt-4"></div>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="bg-gradient-to-r from-[#FF8A00] to-[#FF3D3D] hover:from-[#FF9A20] hover:to-[#FF5D5D] text-white rounded-sm font-bold uppercase tracking-wide font-secondary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Cotización
        </Button>
      </div>

      {/* Lista de Cotizaciones */}
      <Card className="bg-white border-gray-200 rounded-sm">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="font-secondary uppercase text-black">
            Todas las Cotizaciones ({quotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {quotes.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {quotes.map((quote) => (
                <div key={quote.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-black text-black font-secondary">
                          {quote.quote_number}
                        </h3>
                        {getStatusBadge(quote.status)}
                        {quote.client_name && (
                          <div className="flex items-center gap-1 text-sm text-purple-700">
                            <User className="w-3 h-3" />
                            <span>{quote.client_name}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                        {quote.total_offices > 0 && (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-4 h-4 text-blue-500" />
                            <span>{quote.total_offices} oficina(s)</span>
                          </div>
                        )}
                        {quote.parking_storage?.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Car className="w-4 h-4 text-purple-500" />
                            <span>{quote.parking_storage.length} estac./bodega(s)</span>
                          </div>
                        )}
                        {quote.monthly_services?.length > 0 && (
                          <div className="flex items-center gap-1">
                            <RefreshCw className="w-4 h-4 text-orange-500" />
                            <span>{quote.monthly_services.length} servicio(s) recurrente(s)</span>
                          </div>
                        )}
                        {quote.other_services?.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4 text-teal-500" />
                            <span>{quote.other_services.length} otro(s)</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="text-green-600 font-bold">{formatUF(quote.total_sale_value)}</span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-400">
                        {formatDate(quote.created_at)} • {quote.created_by}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => {
                          setSelectedQuote(quote);
                          setEditMode(false);
                          setShowDetailModal(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="rounded-sm"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        onClick={() => handleEditQuote(quote)}
                        variant="outline"
                        size="sm"
                        className="rounded-sm text-blue-600 border-blue-300"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(quote.id)}
                        variant="outline"
                        size="sm"
                        className="rounded-sm text-red-600 border-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-primary">No hay cotizaciones aún</p>
              <p className="text-sm font-primary">Haz clic en "Nueva Cotización" para crear una</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Crear Cotización */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-black text-xl">
              Nueva Cotización
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Cliente */}
            <div>
              <Label className="text-sm font-medium">Cliente Potencial</Label>
              <Input
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                placeholder="Nombre del cliente..."
                className="mt-1"
              />
            </div>
            
            {/* Selector de Items */}
            {itemSelectorJSX}
            
            {/* Notas */}
            <div>
              <Label className="text-sm font-medium">Notas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observaciones adicionales..."
                className="mt-1"
                rows={2}
              />
            </div>
            
            {/* Resumen */}
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Items: {totals.totalItems}</p>
                    <p className="text-xs text-gray-500">Costo: {formatUF(totals.totalCost)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Valor Total</p>
                    <p className="text-2xl font-black text-green-600 font-secondary">
                      {formatUF(totals.totalSale)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Botones */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateQuote}
                disabled={savingChanges || totals.totalItems === 0}
                className="bg-black text-white hover:bg-gray-800"
              >
                {savingChanges ? 'Guardando...' : 'Crear Cotización'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalle/Edición */}
      {selectedQuote && (
        <Dialog open={showDetailModal} onOpenChange={(open) => {
          setShowDetailModal(open);
          if (!open) setEditMode(false);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="font-secondary uppercase text-black text-xl">
                  {selectedQuote.quote_number}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedQuote.status)}
                  {!editMode && (
                    <Button
                      onClick={() => handleEditQuote(selectedQuote)}
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-300"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {/* Cliente */}
              <div className="bg-purple-50 p-3 rounded-sm">
                <Label className="text-xs text-gray-500">Cliente Potencial</Label>
                {editMode ? (
                  <Input
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    className="mt-1 bg-white"
                  />
                ) : (
                  <p className="font-bold text-black">{selectedQuote.client_name || '(Sin nombre)'}</p>
                )}
              </div>
              
              {editMode ? (
                <>
                  {itemSelectorJSX}
                  <div>
                    <Label className="text-sm font-medium">Notas</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Oficinas */}
                  {selectedQuote.offices?.length > 0 && (
                    <Card className="border-blue-200">
                      <CardHeader className="py-2 bg-blue-50">
                        <CardTitle className="text-sm font-secondary flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-600" />
                          Oficinas ({selectedQuote.offices.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-2">
                        {selectedQuote.offices.map((o, i) => (
                          <div key={i} className="flex justify-between p-2 bg-gray-50 rounded mb-1 text-sm">
                            <span><strong>{o.office_number}</strong> - {o.location} ({o.square_meters}m²)</span>
                            <span className="text-green-600 font-bold">{formatUF(o.sale_value_uf)}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Estacionamientos/Bodegas */}
                  {selectedQuote.parking_storage?.length > 0 && (
                    <Card className="border-purple-200">
                      <CardHeader className="py-2 bg-purple-50">
                        <CardTitle className="text-sm font-secondary flex items-center gap-2">
                          <Car className="w-4 h-4 text-purple-600" />
                          Estacionamientos/Bodegas ({selectedQuote.parking_storage.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-2">
                        {selectedQuote.parking_storage.map((ps, i) => (
                          <div key={i} className="flex justify-between p-2 bg-gray-50 rounded mb-1 text-sm">
                            <span><strong>{ps.number}</strong> - {ps.type === 'parking' ? 'Estacionamiento' : 'Bodega'}</span>
                            <span className="text-green-600 font-bold">{formatUF(ps.sale_value_uf)}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Servicios Recurrentes */}
                  {selectedQuote.monthly_services?.length > 0 && (
                    <Card className="border-orange-200">
                      <CardHeader className="py-2 bg-orange-50">
                        <CardTitle className="text-sm font-secondary flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-orange-600" />
                          Servicios Recurrentes ({selectedQuote.monthly_services.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-2">
                        {selectedQuote.monthly_services.map((ms, i) => (
                          <div key={i} className="flex justify-between p-2 bg-gray-50 rounded mb-1 text-sm">
                            <span><strong>{ms.service_name}</strong> {ms.category && `[${ms.category}]`}</span>
                            <span className="text-green-600 font-bold">{formatUF(ms.sale_value_uf)}/mes</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Otros Servicios */}
                  {selectedQuote.other_services?.length > 0 && (
                    <Card className="border-teal-200">
                      <CardHeader className="py-2 bg-teal-50">
                        <CardTitle className="text-sm font-secondary flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-teal-600" />
                          Otros Servicios ({selectedQuote.other_services.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-2">
                        {selectedQuote.other_services.map((os, i) => (
                          <div key={i} className="flex justify-between p-2 bg-gray-50 rounded mb-1 text-sm">
                            <div>
                              <strong>{os.name}</strong>
                              {os.description && <span className="text-gray-500 ml-2">{os.description}</span>}
                            </div>
                            <span className="text-green-600 font-bold">{formatUF(os.sale_value_uf)}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  
                  {selectedQuote.notes && (
                    <div className="bg-gray-50 p-3 rounded-sm">
                      <Label className="text-xs text-gray-500">Notas</Label>
                      <p className="text-sm">{selectedQuote.notes}</p>
                    </div>
                  )}
                </>
              )}
              
              {/* Resumen Total */}
              <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Costo Total</p>
                      <p className="text-xl font-bold text-orange-600">
                        {formatUF(editMode ? totals.totalCost : selectedQuote.total_cost)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Valor Total Venta</p>
                      <p className="text-2xl font-black text-green-600 font-secondary">
                        {formatUF(editMode ? totals.totalSale : selectedQuote.total_sale_value)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Botones */}
              {editMode && (
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setEditMode(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveChanges}
                    disabled={savingChanges}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    {savingChanges ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
