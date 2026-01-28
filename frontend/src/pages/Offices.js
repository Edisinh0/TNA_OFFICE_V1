import { useState, useEffect } from 'react';
import apiClient from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { OfficeFloorPlan } from '../components/OfficeFloorPlan';
import { 
  Plus, 
  Building2, 
  Ruler, 
  Edit, 
  Trash2,
  CheckCircle,
  XCircle,
  Users,
  TrendingUp,
  TrendingDown,
  Share2,
  Copy,
  ExternalLink,
  CheckSquare,
  Square,
  MinusSquare,
  FileText,
  Home
} from 'lucide-react';
import { toast } from 'sonner';

// Valor de la UF (se puede actualizar según necesidad)
const UF_VALUE = 38000; // Valor aproximado en CLP

export const Offices = () => {
  const [offices, setOffices] = useState([]);
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingOffice, setEditingOffice] = useState(null);
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [activeFilter, setActiveFilter] = useState(null);
  const [selectedOffices, setSelectedOffices] = useState([]);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteClientName, setQuoteClientName] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    company_name: '',
    rut: '',
    notes: ''
  });

  const [form, setForm] = useState({
    office_number: '',
    related_office: '',
    square_meters: '',
    capacity: '',
    location: 'NorOriente',
    client_id: '',
    billed_value_uf: '',
    cost_uf: '',
    sale_value_uf: '',
    cost_difference_uf: '',
    cost_difference_clp: '',
    notes: ''
  });

  const locations = ['NorOriente', 'SurOriente', 'NorPoniente', 'SurPoniente'];

  const loadData = async () => {
    try {
      const [officesRes, clientsRes] = await Promise.all([
        apiClient.get('/offices'),
        apiClient.get('/clients')
      ]);
      setOffices(officesRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calcular automáticamente la diferencia de costo cuando cambien los valores
  useEffect(() => {
    const costUF = parseFloat(form.cost_uf) || 0;
    const billedValueUF = parseFloat(form.billed_value_uf) || 0;
    
    // Solo calcular si hay valores válidos
    if (form.cost_uf !== '' || form.billed_value_uf !== '') {
      // Calcular diferencia en UF (Facturado - Costo)
      const differenceUF = billedValueUF - costUF;
      
      // Calcular diferencia en CLP
      const differenceCLP = differenceUF * UF_VALUE;
      
      const newDiffUF = differenceUF.toFixed(2);
      const newDiffCLP = differenceCLP.toFixed(0);
      
      // Actualizar solo si los valores cambiaron realmente
      if (String(form.cost_difference_uf) !== newDiffUF || 
          String(form.cost_difference_clp) !== newDiffCLP) {
        setForm(prev => ({
          ...prev,
          cost_difference_uf: newDiffUF,
          cost_difference_clp: newDiffCLP
        }));
      }
    }
  }, [form.cost_uf, form.billed_value_uf]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...form,
        square_meters: parseFloat(form.square_meters),
        capacity: form.capacity ? parseInt(form.capacity) : Math.floor(parseFloat(form.square_meters) / 3),
        billed_value_uf: parseFloat(form.billed_value_uf) || 0,
        cost_uf: parseFloat(form.cost_uf) || 0,
        sale_value_uf: parseFloat(form.sale_value_uf) || 0,
        cost_difference_uf: parseFloat(form.cost_difference_uf) || 0,
        cost_difference_clp: parseFloat(form.cost_difference_clp) || 0,
        client_id: form.client_id || null
      };

      if (editingOffice) {
        await apiClient.put(`/offices/${editingOffice.id}`, submitData);
        toast.success('Oficina actualizada');
      } else {
        await apiClient.post('/offices', submitData);
        toast.success('Oficina creada');
      }
      
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar oficina');
    }
  };

  const handleEdit = (office) => {
    setEditingOffice(office);
    setForm({
      office_number: office.office_number,
      related_office: office.related_office || '',
      square_meters: office.square_meters.toString(),
      capacity: office.capacity?.toString() || Math.floor(office.square_meters / 3).toString(),
      location: office.location,
      client_id: office.client_id || '',
      billed_value_uf: office.billed_value_uf.toString(),
      cost_uf: office.cost_uf.toString(),
      sale_value_uf: office.sale_value_uf.toString(),
      cost_difference_uf: office.cost_difference_uf.toString(),
      cost_difference_clp: office.cost_difference_clp.toString(),
      notes: office.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (officeId) => {
    if (!window.confirm('¿Eliminar esta oficina?')) return;
    try {
      await apiClient.delete(`/offices/${officeId}`);
      toast.success('Oficina eliminada');
      setSelectedOffices(prev => prev.filter(id => id !== officeId));
      loadData();
    } catch (error) {
      toast.error('Error al eliminar oficina');
    }
  };

  const handleCreateNewClient = async (e) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/clients', newClientForm);
      toast.success('Cliente creado exitosamente');
      setShowNewClientModal(false);
      setNewClientForm({ company_name: '', rut: '', notes: '' });
      
      // Recargar clientes
      await loadData();
      
      // Asignar el nuevo cliente al formulario
      setForm({ ...form, client_id: response.data.id });
    } catch (error) {
      toast.error('Error al crear cliente');
    }
  };

  // Funciones de selección
  const handleSelectOffice = (officeId) => {
    setSelectedOffices(prev => {
      if (prev.includes(officeId)) {
        return prev.filter(id => id !== officeId);
      } else {
        return [...prev, officeId];
      }
    });
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredOffices.map(o => o.id);
    const allSelected = filteredIds.every(id => selectedOffices.includes(id));
    
    if (allSelected) {
      // Deseleccionar todas las oficinas filtradas
      setSelectedOffices(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Seleccionar todas las oficinas filtradas (agregar las que no están)
      const newSelections = filteredIds.filter(id => !selectedOffices.includes(id));
      setSelectedOffices(prev => [...prev, ...newSelections]);
    }
  };

  const handleClearSelection = () => {
    setSelectedOffices([]);
  };

  const handleDeleteSelected = async () => {
    if (selectedOffices.length === 0) {
      toast.error('No hay oficinas seleccionadas');
      return;
    }

    if (window.confirm(`¿Estás seguro de eliminar ${selectedOffices.length} oficina(s) seleccionada(s)?`)) {
      try {
        await Promise.all(
          selectedOffices.map(officeId => apiClient.delete(`/offices/${officeId}`))
        );
        toast.success(`${selectedOffices.length} oficina(s) eliminada(s)`);
        setSelectedOffices([]);
        loadData();
      } catch (error) {
        toast.error('Error al eliminar oficinas');
      }
    }
  };

  const handleCreateQuote = async () => {
    if (selectedOffices.length === 0) {
      toast.error('No hay oficinas seleccionadas');
      return;
    }

    try {
      toast.info('Capturando screenshot del plano...');
      
      // Capturar screenshot del plano con las oficinas seleccionadas
      let screenshotBase64 = '';
      try {
        const svgElement = document.querySelector('svg');
        if (svgElement) {
          // Clonar el SVG para no afectar el original
          const clonedSvg = svgElement.cloneNode(true);
          const svgString = new XMLSerializer().serializeToString(clonedSvg);
          
          // Crear imagen desde SVG
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Obtener dimensiones del SVG
          const svgRect = svgElement.getBoundingClientRect();
          canvas.width = svgRect.width || 1000;
          canvas.height = svgRect.height || 600;
          
          // Crear blob y URL
          const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);
          
          const img = new Image();
          
          await new Promise((resolve, reject) => {
            img.onload = () => {
              try {
                // Fondo blanco
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Dibujar SVG
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Convertir a base64
                screenshotBase64 = canvas.toDataURL('image/png', 0.9);
                
                URL.revokeObjectURL(url);
                console.log('Screenshot capturado exitosamente');
                resolve();
              } catch (err) {
                reject(err);
              }
            };
            img.onerror = (err) => {
              console.error('Error al cargar imagen SVG:', err);
              reject(err);
            };
            img.src = url;
          });
        }
      } catch (error) {
        console.error('Error capturando screenshot:', error);
        toast.warning('No se pudo capturar el screenshot del plano. Podrás subirlo manualmente después.');
      }

      // Crear la cotización
      const response = await apiClient.post('/quotes', {
        office_ids: selectedOffices,
        client_name: quoteClientName,
        floor_plan_screenshot: screenshotBase64,
        notes: quoteNotes
      });

      toast.success(`Cotización ${response.data.quote_number} creada exitosamente`);
      setShowQuoteModal(false);
      setQuoteClientName('');
      setQuoteNotes('');
      setSelectedOffices([]);
      
      // Navegar a la página de cotizaciones
      window.location.href = '/quotes';
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear cotización');
      console.error(error);
    }
  };

  const resetForm = () => {
    setForm({
      office_number: '',
      related_office: '',
      square_meters: '',
      capacity: '',
      location: 'NorOriente',
      client_id: '',
      billed_value_uf: '',
      cost_uf: '',
      sale_value_uf: '',
      cost_difference_uf: '',
      cost_difference_clp: '',
      notes: ''
    });
    setEditingOffice(null);
  };

  const formatUF = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' UF';
  };

  const formatCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getLocationColor = (location) => {
    const colors = {
      'NorOriente': 'bg-blue-100 text-blue-700',
      'SurOriente': 'bg-green-100 text-green-700',
      'NorPoniente': 'bg-orange-100 text-orange-700',
      'SurPoniente': 'bg-purple-100 text-purple-700'
    };
    return colors[location] || 'bg-gray-100 text-gray-700';
  };

  const filteredOffices = offices.filter(office => {
    const locationMatch = filterLocation === 'all' || office.location === filterLocation;
    const statusMatch = filterStatus === 'all' || office.status === filterStatus;
    const clientMatch = filterClient === 'all' || 
                        (filterClient === 'unassigned' ? !office.client_id : office.client_id === filterClient);
    
    // Apply active filter from cards
    if (activeFilter === 'occupied') {
      return office.status === 'occupied' && locationMatch && clientMatch;
    } else if (activeFilter === 'available') {
      return office.status === 'available' && locationMatch && clientMatch;
    } else if (activeFilter === 'positive_margin') {
      return office.margin_percentage > 0 && locationMatch && statusMatch && clientMatch;
    } else if (activeFilter === 'negative_margin') {
      return office.margin_percentage < 0 && locationMatch && statusMatch && clientMatch;
    }
    
    return locationMatch && statusMatch && clientMatch;
  });

  // Determinar qué oficinas usar para los cálculos (seleccionadas o todas las filtradas)
  const officesToCalculate = selectedOffices.length > 0 
    ? filteredOffices.filter(o => selectedOffices.includes(o.id))
    : filteredOffices;

  // Calculate stats based on selected or filtered offices
  const totalOffices = officesToCalculate.length;
  const occupiedOffices = officesToCalculate.filter(o => o.status === 'occupied').length;
  const availableOffices = officesToCalculate.filter(o => o.status === 'available').length;
  
  // Total de metros cuadrados
  const totalSquareMeters = officesToCalculate.reduce((sum, o) => sum + (o.square_meters || 0), 0);
  
  const totalIncome = officesToCalculate
    .filter(o => o.status === 'occupied')
    .reduce((sum, o) => sum + o.billed_value_uf, 0);

  // Total de venta esperada (suma de sale_value_uf de oficinas arrendadas)
  const totalExpectedSale = officesToCalculate
    .filter(o => o.status === 'occupied')
    .reduce((sum, o) => sum + (o.sale_value_uf || 0), 0);

  // Include ALL offices in margin calculation (even those without billing)
  const totalMarginUF = officesToCalculate.reduce((sum, o) => sum + o.cost_difference_uf, 0);
  const totalMarginCLP = officesToCalculate.reduce((sum, o) => sum + o.cost_difference_clp, 0);

  const positiveMarginCount = officesToCalculate.filter(o => o.margin_percentage > 0).length;
  const negativeMarginCount = officesToCalculate.filter(o => o.margin_percentage < 0).length;

  // Calculate margin by client (including offices without billing)
  const clientMargins = {};
  
  // Group by client - usar officesToCalculate para que refleje la selección
  officesToCalculate.forEach(office => {
    if (office.client_id) {
      if (!clientMargins[office.client_id]) {
        clientMargins[office.client_id] = {
          client_name: office.client_name,
          total_margin_uf: 0,
          total_margin_clp: 0,
          office_count: 0
        };
      }
      clientMargins[office.client_id].total_margin_uf += office.cost_difference_uf;
      clientMargins[office.client_id].total_margin_clp += office.cost_difference_clp;
      clientMargins[office.client_id].office_count += 1;
    }
  });
  
  // Add "unassigned" as a pseudo-client for offices without client
  const unassignedOffices = officesToCalculate.filter(o => !o.client_id);
  if (unassignedOffices.length > 0) {
    const unassignedMarginUF = unassignedOffices.reduce((sum, o) => sum + o.cost_difference_uf, 0);
    const unassignedMarginCLP = unassignedOffices.reduce((sum, o) => sum + o.cost_difference_clp, 0);
    
    clientMargins['unassigned'] = {
      client_name: 'Sin Asignar (Disponibles)',
      total_margin_uf: unassignedMarginUF,
      total_margin_clp: unassignedMarginCLP,
      office_count: unassignedOffices.length
    };
  }

  // Sort by margin
  const sortedClients = Object.values(clientMargins).sort((a, b) => b.total_margin_uf - a.total_margin_uf);
  const topClients = sortedClients.slice(0, 3);
  const bottomClients = sortedClients.slice(-3).reverse();

  const handleCardFilter = (filter) => {
    if (activeFilter === filter) {
      // Si ya está activo, desactivar
      setActiveFilter(null);
      setFilterStatus('all');
    } else {
      // Activar nuevo filtro
      setActiveFilter(filter);
      if (filter === 'occupied' || filter === 'available') {
        setFilterStatus(filter);
      } else {
        setFilterStatus('all');
      }
    }
  };

  const copyFanPageLink = () => {
    const fanPageUrl = `${window.location.origin}/oficinas`;
    navigator.clipboard.writeText(fanPageUrl).then(() => {
      toast.success('¡Enlace copiado al portapapeles!');
    }).catch(() => {
      toast.error('Error al copiar enlace');
    });
  };

  return (
    <div className="space-y-6" data-testid="offices-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-secondary text-4xl md:text-5xl font-black uppercase text-black tracking-tight">
            ADMINISTRACIÓN DE OFICINAS
          </h1>
          <div className="h-1 w-32 tna-gradient mt-4"></div>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-black text-white hover:bg-gray-800 rounded-sm font-bold uppercase tracking-wide font-secondary"
        >
          <Plus className="w-4 h-4 mr-2" />
          NUEVA OFICINA
        </Button>
      </div>

      {/* Fan Page Link Card */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 rounded-sm shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-green-600 p-2 rounded-lg">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-secondary text-sm uppercase text-green-900 font-bold">
                  Fan Page Pública de Oficinas
                </p>
                <p className="text-xs text-green-700 font-primary">
                  Comparte este enlace con clientes potenciales
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-white border border-green-200 rounded px-3 py-2">
                <code className="text-sm text-gray-700 font-mono">
                  {window.location.origin}/oficinas
                </code>
              </div>
              <Button
                onClick={copyFanPageLink}
                className="bg-green-600 hover:bg-green-700 text-white rounded-sm font-secondary uppercase text-xs tracking-wide"
                size="sm"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copiar Link
              </Button>
              <Button
                onClick={() => window.open('/oficinas', '_blank')}
                variant="outline"
                className="bg-white border-green-300 text-green-700 hover:bg-green-50 rounded-sm font-secondary uppercase text-xs tracking-wide"
                size="sm"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Abrir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Floor Plan */}
      <OfficeFloorPlan 
        offices={offices}
        filteredOffices={filteredOffices}
        selectedOfficeIds={selectedOffices}
        onOfficeSelect={(office) => {
          // Al hacer click en una oficina del plano, agregar/quitar de la selección
          setSelectedOffices(prev => {
            if (prev.includes(office.id)) {
              return prev.filter(id => id !== office.id);
            } else {
              return [...prev, office.id];
            }
          });
        }}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Indicador de selección */}
        {selectedOffices.length > 0 && (
          <div className="lg:col-span-5 bg-orange-100 border border-orange-300 rounded-sm p-3 flex items-center justify-between">
            <p className="text-sm text-orange-800 font-primary">
              <span className="font-bold">{selectedOffices.length}</span> oficinas seleccionadas - Los totales reflejan solo la selección
            </p>
            <button 
              onClick={() => setSelectedOffices([])}
              className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded font-primary"
            >
              Limpiar selección
            </button>
          </div>
        )}
        
        <Card 
          className={`bg-white border-gray-200 rounded-sm cursor-pointer transition-all hover:shadow-md ${
            activeFilter === null ? 'ring-2 ring-blue-500' : ''
          } ${selectedOffices.length > 0 ? 'ring-2 ring-orange-400' : ''}`}
          onClick={() => {
            setActiveFilter(null);
            setFilterStatus('all');
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-secondary uppercase text-gray-600">Total Oficinas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black font-primary">{totalOffices}</div>
            <p className="text-xs text-gray-500 font-primary mt-1">
              {selectedOffices.length > 0 
                ? `${selectedOffices.length} seleccionadas`
                : (filterLocation !== 'all' || filterClient !== 'all') ? 'Filtrado' : 'Click para ver todas'}
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`bg-white border-gray-200 rounded-sm cursor-pointer transition-all hover:shadow-md ${
            activeFilter === 'occupied' ? 'ring-2 ring-green-500' : ''
          } ${selectedOffices.length > 0 ? 'ring-2 ring-orange-400' : ''}`}
          onClick={() => handleCardFilter('occupied')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-secondary uppercase text-gray-600">Ocupadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 font-primary">
              {occupiedOffices}
            </div>
            <p className="text-xs text-gray-500 font-primary mt-1">
              {selectedOffices.length > 0 ? `De ${selectedOffices.length} sel.` : 'Click para filtrar'}
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`bg-white border-gray-200 rounded-sm cursor-pointer transition-all hover:shadow-md ${
            activeFilter === 'available' ? 'ring-2 ring-blue-500' : ''
          } ${selectedOffices.length > 0 ? 'ring-2 ring-orange-400' : ''}`}
          onClick={() => handleCardFilter('available')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-secondary uppercase text-gray-600">Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 font-primary">
              {availableOffices}
            </div>
            <p className="text-xs text-gray-500 font-primary mt-1">
              {selectedOffices.length > 0 ? `De ${selectedOffices.length} sel.` : 'Click para filtrar'}
            </p>
          </CardContent>
        </Card>

        <Card className={`bg-white border-gray-200 rounded-sm ${selectedOffices.length > 0 ? 'ring-2 ring-orange-400' : ''}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-secondary uppercase text-gray-600">Metros Cuadrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 font-primary">
              {totalSquareMeters.toFixed(1)}m²
            </div>
            <p className="text-xs text-gray-500 font-primary mt-1">
              {selectedOffices.length > 0 
                ? `${selectedOffices.length} seleccionadas`
                : 'Total superficie'}
            </p>
          </CardContent>
        </Card>

        <Card className={`bg-white border-gray-200 rounded-sm ${selectedOffices.length > 0 ? 'ring-2 ring-orange-400' : ''}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-secondary uppercase text-gray-600">Ingresos (Facturado)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black font-primary">
              {formatUF(totalIncome)}
            </div>
            <p className="text-xs text-gray-500 font-primary mt-1">
              {selectedOffices.length > 0 
                ? `${selectedOffices.length} seleccionadas` 
                : (filterLocation !== 'all' || filterClient !== 'all') ? 'Filtrado' : 'Solo ocupadas'}
            </p>
          </CardContent>
        </Card>

        <Card className={`bg-white border-gray-200 rounded-sm ${selectedOffices.length > 0 ? 'ring-2 ring-orange-400' : ''}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-secondary uppercase text-gray-600">Venta Esperada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 font-primary">
              {formatUF(totalExpectedSale)}
            </div>
            <p className="text-xs text-gray-700 font-primary mt-1">
              {formatCLP(totalExpectedSale * UF_VALUE)}
            </p>
            <p className="text-xs text-gray-500 font-primary mt-1">
              {selectedOffices.length > 0 ? `${selectedOffices.length} seleccionadas` : 'Solo ocupadas'}
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`bg-white border-gray-200 rounded-sm cursor-pointer transition-all hover:shadow-md ${
            activeFilter === 'positive_margin' || activeFilter === 'negative_margin' ? 'ring-2 ring-purple-500' : ''
          } ${selectedOffices.length > 0 ? 'ring-2 ring-orange-400' : ''}`}
          onClick={() => {
            if (activeFilter === 'positive_margin') {
              handleCardFilter('negative_margin');
            } else if (activeFilter === 'negative_margin') {
              setActiveFilter(null);
            } else {
              handleCardFilter('positive_margin');
            }
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-secondary uppercase text-gray-600 flex items-center gap-1">
              Margen Ejercicio
              {totalMarginUF >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-primary ${
              totalMarginUF >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatUF(totalMarginUF)}
            </div>
            <p className="text-xs text-gray-700 font-primary mt-1">
              {formatCLP(totalMarginCLP)}
            </p>
            <p className="text-xs text-gray-500 font-primary mt-1">
              {selectedOffices.length > 0 
                ? `${selectedOffices.length} seleccionadas`
                : activeFilter === 'positive_margin' ? `${positiveMarginCount} positivos` : 
                  activeFilter === 'negative_margin' ? `${negativeMarginCount} negativos` : 
                  'Click: positivos → negativos'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border-gray-200 rounded-sm">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="font-secondary uppercase text-black">Filtros</CardTitle>
            {(filterLocation !== 'all' || filterStatus !== 'all' || filterClient !== 'all') && (
              <Button
                onClick={() => {
                  setFilterLocation('all');
                  setFilterStatus('all');
                  setFilterClient('all');
                  setActiveFilter(null);
                  // Seleccionar todas las oficinas al limpiar filtros
                  setSelectedOffices(offices.map(o => o.id));
                }}
                variant="outline"
                size="sm"
                className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 rounded-sm"
              >
                Limpiar todos
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-black font-primary font-medium">Ubicación</Label>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-sm bg-white text-black"
              >
                <option value="all">Todas las ubicaciones</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Estado</Label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-sm bg-white text-black"
              >
                <option value="all">Todos los estados</option>
                <option value="available">Disponible</option>
                <option value="occupied">Ocupada</option>
              </select>
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Empresa/Cliente</Label>
              <select
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-sm bg-white text-black"
              >
                <option value="all">Todas las empresas</option>
                <option value="unassigned">Sin asignar</option>
                {clients
                  .filter(client => offices.some(o => o.client_id === client.id))
                  .sort((a, b) => a.company_name.localeCompare(b.company_name))
                  .map(client => (
                    <option key={client.id} value={client.id}>{client.company_name}</option>
                  ))
                }
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Clients Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 3 Best Margins */}
        <Card className="bg-white border-gray-200 rounded-sm">
          <CardHeader className="border-b border-gray-200 bg-green-50">
            <CardTitle className="font-secondary uppercase text-black flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Top 3 Clientes - Mejor Margen
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {topClients.length > 0 ? (
              <div className="space-y-3">
                {topClients.map((client, index) => (
                  <div 
                    key={client.client_name}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-sm border border-green-200 hover:bg-green-100 transition-colors cursor-pointer"
                    onClick={() => {
                      const clientObj = clients.find(c => c.company_name === client.client_name);
                      if (clientObj) {
                        setFilterClient(clientObj.id);
                        setActiveFilter(null);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm font-primary">{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-black font-primary">{client.client_name}</p>
                        <p className="text-xs text-gray-600 font-primary">{client.office_count} oficina{client.office_count > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600 font-primary">
                        {formatUF(client.total_margin_uf)}
                      </p>
                      <p className="text-xs text-gray-600 font-primary">
                        {formatCLP(client.total_margin_clp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm font-primary">No hay datos disponibles</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 3 Worst Margins */}
        <Card className="bg-white border-gray-200 rounded-sm">
          <CardHeader className="border-b border-gray-200 bg-red-50">
            <CardTitle className="font-secondary uppercase text-black flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              Top 3 Clientes - Peor Margen
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {bottomClients.length > 0 ? (
              <div className="space-y-3">
                {bottomClients.map((client, index) => (
                  <div 
                    key={client.client_name}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-sm border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
                    onClick={() => {
                      const clientObj = clients.find(c => c.company_name === client.client_name);
                      if (clientObj) {
                        setFilterClient(clientObj.id);
                        setActiveFilter(null);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm font-primary">{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-black font-primary">{client.client_name}</p>
                        <p className="text-xs text-gray-600 font-primary">{client.office_count} oficina{client.office_count > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600 font-primary">
                        {formatUF(client.total_margin_uf)}
                      </p>
                      <p className="text-xs text-gray-600 font-primary">
                        {formatCLP(client.total_margin_clp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingDown className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm font-primary">No hay datos disponibles</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Filter Indicator */}
      {(activeFilter || filterClient !== 'all') && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-primary text-blue-900">
              <strong>Filtros activos:</strong>
            </span>
            {activeFilter && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-primary">
                {
                  activeFilter === 'occupied' ? 'Ocupadas' :
                  activeFilter === 'available' ? 'Disponibles' :
                  activeFilter === 'positive_margin' ? 'Margen Positivo' :
                  activeFilter === 'negative_margin' ? 'Margen Negativo' : ''
                }
              </span>
            )}
            {filterClient !== 'all' && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-primary">
                {filterClient === 'unassigned' ? 'Sin asignar' : clients.find(c => c.id === filterClient)?.company_name}
              </span>
            )}
            <span className="text-sm font-primary text-blue-900">
              ({filteredOffices.length} oficinas)
            </span>
          </div>
          <Button
            onClick={() => {
              setActiveFilter(null);
              setFilterStatus('all');
              setFilterClient('all');
            }}
            variant="outline"
            size="sm"
            className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50 rounded-sm"
          >
            Limpiar filtros
          </Button>
        </div>
      )}

      {/* Offices List */}
      {/* Barra de acciones de selección */}
      {selectedOffices.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 rounded-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                <span className="font-primary font-semibold text-gray-900">
                  {selectedOffices.length} oficina(s) seleccionada(s)
                </span>
                <span className="text-sm text-gray-600 font-primary">
                  {selectedOffices.filter(id => filteredOffices.find(o => o.id === id)).length} visible(s) en filtro actual
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowQuoteModal(true)}
                  variant="outline"
                  size="sm"
                  className="bg-white border-blue-300 text-blue-600 hover:bg-blue-50 rounded-sm"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Crear Cotización
                </Button>
                <Button
                  onClick={handleClearSelection}
                  variant="outline"
                  size="sm"
                  className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 rounded-sm"
                >
                  Limpiar selección
                </Button>
                <Button
                  onClick={handleDeleteSelected}
                  variant="outline"
                  size="sm"
                  className="bg-white border-red-300 text-red-600 hover:bg-red-50 rounded-sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar seleccionadas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white border-gray-200 rounded-sm">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="font-secondary uppercase text-black">
            Listado de Oficinas {activeFilter && `(${filteredOffices.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredOffices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-secondary uppercase text-gray-600">
                      <button
                        onClick={handleSelectAllFiltered}
                        className="flex items-center justify-center w-full hover:bg-gray-100 rounded p-1 transition-colors"
                        title="Seleccionar/Deseleccionar todas las filtradas"
                      >
                        {(() => {
                          const filteredIds = filteredOffices.map(o => o.id);
                          const selectedInFilter = filteredIds.filter(id => selectedOffices.includes(id));
                          if (selectedInFilter.length === 0) {
                            return <Square className="w-4 h-4 text-gray-400" />;
                          } else if (selectedInFilter.length === filteredIds.length) {
                            return <CheckSquare className="w-4 h-4 text-blue-600" />;
                          } else {
                            return <MinusSquare className="w-4 h-4 text-blue-600" />;
                          }
                        })()}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-secondary uppercase text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-secondary uppercase text-gray-600">Oficina</th>
                    <th className="px-4 py-3 text-left text-xs font-secondary uppercase text-gray-600">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-secondary uppercase text-gray-600">Ubicación</th>
                    <th className="px-4 py-3 text-right text-xs font-secondary uppercase text-gray-600">m²</th>
                    <th className="px-4 py-3 text-right text-xs font-secondary uppercase text-gray-600">Capacidad</th>
                    <th className="px-4 py-3 text-right text-xs font-secondary uppercase text-gray-600">Venta Esperada</th>
                    <th className="px-4 py-3 text-right text-xs font-secondary uppercase text-gray-600">Facturado</th>
                    <th className="px-4 py-3 text-right text-xs font-secondary uppercase text-gray-600">Costo</th>
                    <th className="px-4 py-3 text-right text-xs font-secondary uppercase text-gray-600">Margen</th>
                    <th className="px-4 py-3 text-right text-xs font-secondary uppercase text-gray-600">Dif. UF</th>
                    <th className="px-4 py-3 text-right text-xs font-secondary uppercase text-gray-600">Dif. CLP</th>
                    <th className="px-4 py-3 text-center text-xs font-secondary uppercase text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOffices.map((office) => {
                    const marginIsNegative = office.margin_percentage < 0;
                    const hasNoIncome = office.billed_value_uf === 0;
                    
                    return (
                      <tr key={office.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleSelectOffice(office.id)}
                            className="flex items-center justify-center w-full hover:bg-gray-100 rounded p-1 transition-colors"
                          >
                            {selectedOffices.includes(office.id) ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {office.status === 'occupied' ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-xs text-green-600 font-primary font-medium">Ocupada</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <XCircle className="w-4 h-4 text-gray-400" />
                              <span className="text-xs text-gray-500 font-primary">Disponible</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-blue-600" />
                            <div>
                              <p className="text-sm font-bold text-black font-primary">{office.office_number}</p>
                              {office.related_office && (
                                <p className="text-xs text-gray-500 font-primary">{office.related_office}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {office.client_name ? (
                            <p className="text-sm text-black font-primary font-medium">{office.client_name}</p>
                          ) : (
                            <p className="text-sm text-gray-400 font-primary italic">Sin asignar</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded ${getLocationColor(office.location)} font-primary`}>
                            {office.location}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm text-gray-700 font-primary">{office.square_meters}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm text-gray-700 font-primary">
                            {office.capacity || Math.floor(office.square_meters / 3)} personas
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-bold text-purple-600 font-primary">
                            {formatUF(office.sale_value_uf)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-bold text-green-600 font-primary">
                            {formatUF(office.billed_value_uf)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-bold text-orange-600 font-primary">
                            {formatUF(office.cost_uf)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {marginIsNegative ? (
                              <TrendingDown className="w-3 h-3 text-red-600" />
                            ) : (
                              <TrendingUp className="w-3 h-3 text-green-600" />
                            )}
                            <p className={`text-sm font-bold font-primary ${
                              marginIsNegative ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {office.margin_percentage.toFixed(2)}%
                            </p>
                            {hasNoIncome && (
                              <span className="text-xs text-red-500 font-primary ml-1">*</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className={`text-sm font-primary ${
                            office.cost_difference_uf < 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {formatUF(office.cost_difference_uf)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className={`text-sm font-primary ${
                            office.cost_difference_clp < 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {formatCLP(office.cost_difference_clp)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              onClick={() => handleEdit(office)}
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 bg-white border-gray-300 text-black hover:bg-gray-50 rounded-sm"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(office.id)}
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 bg-white border-red-300 text-red-600 hover:bg-red-50 rounded-sm"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" strokeWidth={1} />
              <p className="text-gray-500 font-primary">No hay oficinas que coincidan con los filtros</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-white border-gray-200 text-black max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl text-black">
              {editingOffice ? 'EDITAR OFICINA' : 'NUEVA OFICINA'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-black font-primary font-medium">Número de Oficina *</Label>
                <Input
                  value={form.office_number}
                  onChange={(e) => setForm({ ...form, office_number: e.target.value })}
                  placeholder="1701"
                  className="bg-white border-gray-300 text-black"
                  required
                />
              </div>
              <div>
                <Label className="text-black font-primary font-medium">Oficina Relacionada</Label>
                <Input
                  value={form.related_office}
                  onChange={(e) => setForm({ ...form, related_office: e.target.value })}
                  placeholder="1701 IN"
                  className="bg-white border-gray-300 text-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-black font-primary font-medium">Metros Cuadrados *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.square_meters}
                  onChange={(e) => {
                    const m2 = e.target.value;
                    setForm({ 
                      ...form, 
                      square_meters: m2,
                      capacity: m2 ? Math.floor(parseFloat(m2) / 3).toString() : ''
                    });
                  }}
                  placeholder="45.5"
                  className="bg-white border-gray-300 text-black"
                  required
                />
              </div>
              <div>
                <Label className="text-black font-primary font-medium">
                  Capacidad (personas) *
                  <span className="text-xs text-gray-500 block">1 persona / 3m²</span>
                </Label>
                <Input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="15"
                  className="bg-white border-gray-300 text-black"
                  required
                />
              </div>
              <div>
                <Label className="text-black font-primary font-medium">Ubicación *</Label>
                <select
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-sm bg-white text-black"
                  required
                >
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="text-black font-primary font-medium">Cliente Asignado</Label>
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

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-black font-primary font-medium">Valor Facturado (UF)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.billed_value_uf}
                  onChange={(e) => setForm({ ...form, billed_value_uf: e.target.value })}
                  placeholder="17.50"
                  className="bg-white border-gray-300 text-black"
                />
              </div>
              <div>
                <Label className="text-black font-primary font-medium">Costo (UF)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.cost_uf}
                  onChange={(e) => setForm({ ...form, cost_uf: e.target.value })}
                  placeholder="20.14"
                  className="bg-white border-gray-300 text-black"
                />
              </div>
              <div>
                <Label className="text-black font-primary font-medium">Venta Esperada (UF)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.sale_value_uf}
                  onChange={(e) => setForm({ ...form, sale_value_uf: e.target.value })}
                  placeholder="24.38"
                  className="bg-white border-gray-300 text-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-black font-primary font-medium">Diferencia Costo (UF) <span className="text-xs text-gray-500">(auto)</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.cost_difference_uf}
                  readOnly
                  disabled
                  placeholder="Calculado automáticamente"
                  className="bg-gray-100 border-gray-300 text-black cursor-not-allowed"
                />
              </div>
              <div>
                <Label className="text-black font-primary font-medium">Diferencia Costo (CLP) <span className="text-xs text-gray-500">(auto)</span></Label>
                <Input
                  type="number"
                  step="1"
                  value={form.cost_difference_clp}
                  readOnly
                  disabled
                  placeholder="Calculado automáticamente"
                  className="bg-gray-100 border-gray-300 text-black cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <Label className="text-black font-primary font-medium">Notas</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Información adicional..."
                className="bg-white border-gray-300 text-black min-h-20"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                variant="outline"
                className="flex-1 bg-white border-gray-300 text-black hover:bg-gray-50 rounded-sm"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-black text-white hover:bg-gray-800 rounded-sm font-bold uppercase tracking-wide font-secondary"
              >
                {editingOffice ? 'ACTUALIZAR' : 'CREAR'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Cotización */}
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-black">
              Crear Cotización
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Resumen de oficinas seleccionadas */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-4">
                <h3 className="font-secondary uppercase text-black mb-4">
                  Oficinas Seleccionadas ({selectedOffices.length})
                </h3>
                
                <div className="space-y-2 mb-4">
                  {selectedOffices.map(officeId => {
                    const office = offices.find(o => o.id === officeId);
                    if (!office) return null;
                    return (
                      <div key={office.id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="font-secondary font-bold text-lg">{office.office_number}</span>
                          <span className="text-sm text-gray-600">{office.location}</span>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <span><strong>{office.square_meters}m²</strong></span>
                          <span><strong>{office.capacity || Math.floor(office.square_meters / 3)} pers.</strong></span>
                          <span className="text-green-600 font-bold">{formatUF(office.sale_value_uf)}</span>
                          <span className="text-orange-600 font-bold">Costo: {formatUF(office.cost_uf || 0)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Totales */}
                <div className="border-t-2 border-blue-300 pt-4 mt-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Total m²</div>
                      <div className="text-2xl font-black text-black font-secondary">
                        {selectedOffices.reduce((sum, id) => {
                          const office = offices.find(o => o.id === id);
                          return sum + (office?.square_meters || 0);
                        }, 0).toFixed(1)}m²
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Capacidad Total</div>
                      <div className="text-2xl font-black text-black font-secondary">
                        {selectedOffices.reduce((sum, id) => {
                          const office = offices.find(o => o.id === id);
                          const capacity = office?.capacity || Math.floor(office?.square_meters / 3) || 0;
                          return sum + capacity;
                        }, 0)} pers.
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Valor Total</div>
                      <div className="text-2xl font-black text-green-600 font-secondary">
                        {formatUF(selectedOffices.reduce((sum, id) => {
                          const office = offices.find(o => o.id === id);
                          return sum + (office?.sale_value_uf || 0);
                        }, 0))}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Costo Total</div>
                      <div className="text-2xl font-black text-orange-600 font-secondary">
                        {formatUF(selectedOffices.reduce((sum, id) => {
                          const office = offices.find(o => o.id === id);
                          return sum + (office?.cost_uf || 0);
                        }, 0))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Cliente Potencial */}
            <div>
              <Label className="text-black font-primary font-medium">Cliente Potencial</Label>
              <Input
                value={quoteClientName}
                onChange={(e) => setQuoteClientName(e.target.value)}
                placeholder="Nombre del cliente potencial..."
                className="mt-2 bg-white border-gray-300 text-black font-primary"
              />
            </div>
            
            {/* Notas */}
            <div>
              <Label className="text-black font-primary font-medium">Notas (Opcional)</Label>
              <Textarea
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                placeholder="Agrega notas adicionales para esta cotización..."
                className="mt-2 bg-white border-gray-300 text-black font-primary"
                rows={4}
              />
            </div>
            
            {/* Botones */}
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setShowQuoteModal(false)}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-sm"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateQuote}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-sm"
              >
                <FileText className="w-4 h-4 mr-2" />
                Crear Cotización
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para crear nuevo cliente */}
      <Dialog open={showNewClientModal} onOpenChange={setShowNewClientModal}>
        <DialogContent className="bg-white border-gray-200 text-black">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl text-black">
              CREAR NUEVO CLIENTE
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateNewClient} className="space-y-4 mt-4">
            <div>
              <Label className="text-black font-primary font-medium">Nombre de la empresa</Label>
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
                placeholder="Ej: 12.345.678-9"
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Notas</Label>
              <Textarea
                value={newClientForm.notes}
                onChange={(e) => setNewClientForm({ ...newClientForm, notes: e.target.value })}
                className="bg-white border-gray-300 text-black"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 bg-black text-white hover:bg-gray-800 rounded-sm font-bold uppercase tracking-wide font-secondary"
              >
                CREAR CLIENTE
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowNewClientModal(false);
                  setNewClientForm({ company_name: '', rut: '', notes: '' });
                }}
                className="border-gray-300"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
};