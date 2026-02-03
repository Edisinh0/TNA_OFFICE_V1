import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { TrendingUp, Calendar as CalendarIcon, Bell, AlertTriangle, FileText, Clock, Plus, Save, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getUser } from '../utils/auth';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import '../styles/calendar-custom.css';

moment.locale('es');
const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop(Calendar);

// Paleta de colores fijos para cada recurso
const RESOURCE_COLORS = {
  'Sala Badajoz': '#10b981',      // verde esmeralda
  'Sala Rosario': '#3b82f6',      // azul
  'Sala Gran Apoquindo': '#c084fc', // púrpura
  'Sala iContel': '#fbbf24',      // amarillo/dorado
  'Caseta 1': '#06b6d4',          // cyan
  'Caseta 2': '#ec4899',          // rosa
};

// Colores de respaldo para recursos nuevos
const FALLBACK_COLORS = [
  '#ef4444', // red
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
  '#84cc16', // lime
  '#a855f7', // violet
];

export const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [expiringContracts, setExpiringContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();
  
  // Estado para el valor de la UF
  const [ufValue, setUfValue] = useState(() => {
    const saved = localStorage.getItem('ufValue');
    return saved ? JSON.parse(saved) : { value: 38000, date: null };
  });
  const [loadingUF, setLoadingUF] = useState(false);
  
  // Estados para métricas de ventas
  const [tickets, setTickets] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Estados para el calendario completo
  const [bookings, setBookings] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [booths, setBooths] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [selectedResources, setSelectedResources] = useState([]); // Filtro de recursos
  const [bookingForm, setBookingForm] = useState({
    resource_type: '',
    resource_id: '',
    resource_name: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    start_time: '',
    end_time: '',
    notes: '',
    status: 'pending'
  });

  // Generar lista de meses disponibles
  const getAvailableMonths = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
      months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return months;
  };

  const availableMonths = getAvailableMonths();

  useEffect(() => {
    loadAllData();
  }, []);

  // Función para obtener el valor de la UF desde mindicadores.cl
  const fetchUFValue = async () => {
    setLoadingUF(true);
    try {
      const response = await apiClient.get('/uf');
      const data = response.data;
      if (data && data.serie && data.serie.length > 0) {
        const latestUF = data.serie[0];
        const newUfValue = {
          value: Math.round(latestUF.valor),
          date: new Date().toISOString()
        };
        setUfValue(newUfValue);
        localStorage.setItem('ufValue', JSON.stringify(newUfValue));
        toast.success(`UF actualizada: $${newUfValue.value.toLocaleString('es-CL')}`);
      }
    } catch (error) {
      console.error('Error fetching UF:', error);
      toast.error('Error al obtener valor de la UF');
    } finally {
      setLoadingUF(false);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [statsRes, contractsRes, ticketsRes, roomsRes, boothsRes, bookingsRes, requestsRes] = await Promise.all([
        apiClient.get('/dashboard/stats'),
        apiClient.get('/contracts/expiring-soon'),
        apiClient.get('/tickets'),
        apiClient.get('/rooms'),
        apiClient.get('/booths'),
        apiClient.get('/bookings'),
        apiClient.get('/requests')
      ]);
      
      setStats(statsRes.data);
      setExpiringContracts(contractsRes.data);
      setTickets(ticketsRes.data);
      setRooms(roomsRes.data);
      setBooths(boothsRes.data);
      setBookings(bookingsRes.data);

      // DEBUG: Verificar datos de reservas
      console.log('📅 Dashboard - Bookings cargadas:', bookingsRes.data.length);
      if (bookingsRes.data.length > 0) {
        console.log('📅 Primera reserva:', bookingsRes.data[0]);
      }
      
      const bookingRequests = requestsRes.data.filter(
        r => r.request_type === 'booking' && r.status === 'new'
      );
      setPendingRequests(bookingRequests);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // Calcular métricas de ventas
  const calculateSalesMetrics = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const selectedMonthIndex = month - 1;
    
    const monthSales = tickets.filter(ticket => {
      const saleDate = new Date(ticket.ticket_date);
      return saleDate.getMonth() === selectedMonthIndex && saleDate.getFullYear() === year;
    });
    
    // Usar || 0 para manejar valores null/undefined y evitar NaN
    const totalMonth = monthSales.reduce((sum, ticket) => sum + (ticket.total_amount || ticket.total || 0), 0);
    const pendingSales = tickets.filter(ticket => ticket.payment_status === 'pending');
    const totalPending = pendingSales.reduce((sum, ticket) => sum + (ticket.total_amount || ticket.total || 0), 0);
    
    return {
      totalMonth,
      monthSalesCount: monthSales.length,
      pendingCount: pendingSales.length,
      totalPending
    };
  };

  const salesMetrics = calculateSalesMetrics();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };

  // ========== FUNCIONES DEL CALENDARIO ==========

  // Manejar movimiento de evento (drag and drop)
  const handleEventDrop = async ({ event, start, end }) => {
    const booking = event.resource;
    
    if (booking.status === 'blocked') {
      toast.error('No puedes mover reservas bloqueadas automáticamente');
      return;
    }

    try {
      await apiClient.put(`/bookings/${booking.id}`, {
        start_time: moment(start).format('YYYY-MM-DDTHH:mm'),
        end_time: moment(end).format('YYYY-MM-DDTHH:mm')
      });
      
      toast.success('Reserva movida exitosamente');
      loadAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al mover la reserva');
    }
  };

  // Manejar redimensionamiento de evento
  const handleEventResize = async ({ event, start, end }) => {
    const booking = event.resource;
    
    if (booking.status === 'blocked') {
      toast.error('No puedes redimensionar reservas bloqueadas automáticamente');
      return;
    }

    try {
      await apiClient.put(`/bookings/${booking.id}`, {
        start_time: moment(start).format('YYYY-MM-DDTHH:mm'),
        end_time: moment(end).format('YYYY-MM-DDTHH:mm')
      });
      
      toast.success('Duración de reserva actualizada');
      loadAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al redimensionar la reserva');
    }
  };

  // Manejar selección de rango para crear nueva reserva
  const handleSelectSlot = (slotInfo) => {
    setBookingForm({
      resource_type: '',
      resource_id: '',
      resource_name: '',
      client_name: '',
      client_email: '',
      client_phone: '',
      start_time: moment(slotInfo.start).format('YYYY-MM-DDTHH:mm'),
      end_time: moment(slotInfo.end).format('YYYY-MM-DDTHH:mm'),
      notes: '',
      status: 'pending'
    });
    setShowBookingModal(true);
  };

  // Crear nueva reserva
  const handleCreateBooking = async () => {
    if (!bookingForm.resource_id || !bookingForm.client_name || !bookingForm.client_email) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      const resourceName = bookingForm.resource_name || 
        [...rooms, ...booths].find(r => r.id === bookingForm.resource_id)?.name;
      
      await apiClient.post('/bookings', {
        ...bookingForm,
        resource_name: resourceName
      });
      
      toast.success('Reserva creada exitosamente');
      setShowBookingModal(false);
      
      // Resetear formulario
      setBookingForm({
        resource_type: '',
        resource_id: '',
        resource_name: '',
        client_name: '',
        client_email: '',
        client_phone: '',
        start_time: '',
        end_time: '',
        notes: '',
        status: 'pending'
      });
      
      // Recargar datos inmediatamente
      await loadAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear la reserva');
    }
  };

  // Toggle filtro de recurso
  const toggleResourceFilter = (resourceId) => {
    setSelectedResources(prev => {
      if (prev.includes(resourceId)) {
        return prev.filter(id => id !== resourceId);
      } else {
        return [...prev, resourceId];
      }
    });
  };

  // Limpiar filtros
  const clearResourceFilters = () => {
    setSelectedResources([]);
  };

  // Abrir modal de edición
  const handleEditBooking = (booking) => {
    if (booking.status === 'blocked') {
      toast.error('No puedes editar reservas bloqueadas automáticamente');
      return;
    }

    // Obtener datetime completo para el formulario
    const getStartDateTime = () => {
      if (booking.start_datetime) return moment(booking.start_datetime).format('YYYY-MM-DDTHH:mm');
      if (booking.date && booking.start_time) return moment(`${booking.date}T${booking.start_time}`).format('YYYY-MM-DDTHH:mm');
      return '';
    };

    const getEndDateTime = () => {
      if (booking.end_datetime) return moment(booking.end_datetime).format('YYYY-MM-DDTHH:mm');
      if (booking.date && booking.end_time) return moment(`${booking.date}T${booking.end_time}`).format('YYYY-MM-DDTHH:mm');
      return '';
    };

    setEditingBooking(booking);
    setBookingForm({
      resource_type: booking.resource_type,
      resource_id: booking.resource_id,
      resource_name: booking.resource_name,
      client_name: booking.client_name,
      client_email: booking.client_email,
      client_phone: booking.client_phone || '',
      start_time: getStartDateTime(),
      end_time: getEndDateTime(),
      notes: booking.notes || '',
      status: booking.status
    });
    setShowEditModal(true);
  };

  // Actualizar reserva existente
  const handleUpdateBooking = async () => {
    if (!bookingForm.resource_id || !bookingForm.client_name || !bookingForm.client_email) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      if (bookingForm.resource_id !== editingBooking.resource_id) {
        await apiClient.put(`/bookings/${editingBooking.id}`, { status: 'cancelled' });
        await apiClient.post('/bookings', {
          resource_type: bookingForm.resource_type,
          resource_id: bookingForm.resource_id,
          resource_name: bookingForm.resource_name,
          client_name: bookingForm.client_name,
          client_email: bookingForm.client_email,
          client_phone: bookingForm.client_phone,
          start_time: bookingForm.start_time,
          end_time: bookingForm.end_time,
          notes: bookingForm.notes,
          status: bookingForm.status
        });
        toast.success('Reserva actualizada con nuevo recurso');
      } else {
        await apiClient.put(`/bookings/${editingBooking.id}`, {
          start_time: bookingForm.start_time,
          end_time: bookingForm.end_time,
          client_name: bookingForm.client_name,
          client_email: bookingForm.client_email,
          client_phone: bookingForm.client_phone,
          notes: bookingForm.notes,
          status: bookingForm.status
        });
        toast.success('Reserva actualizada exitosamente');
      }
      
      setShowEditModal(false);
      setEditingBooking(null);
      loadAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar la reserva');
    }
  };

  // Cancelar reserva
  const handleDeleteBooking = async () => {
    if (!window.confirm('¿Estás seguro de que quieres cancelar esta reserva?')) {
      return;
    }

    try {
      await apiClient.put(`/bookings/${editingBooking.id}`, { status: 'cancelled' });
      toast.success('Reserva cancelada exitosamente');
      setShowEditModal(false);
      setEditingBooking(null);
      loadAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cancelar la reserva');
    }
  };

  // Mapa de colores de recursos
  const resourceColorMap = useMemo(() => {
    const allResources = [
      ...rooms.map(r => ({ id: r.id, name: r.name, type: 'room' })),
      ...booths.map(b => ({ id: b.id, name: b.name, type: 'booth' }))
    ];
    
    const colorMap = {};
    let fallbackIndex = 0;
    
    allResources.forEach((resource) => {
      // Usar color fijo si existe, sino usar color de respaldo
      let color = RESOURCE_COLORS[resource.name];
      
      if (!color) {
        color = FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
        fallbackIndex++;
      }
      
      colorMap[resource.id] = {
        name: resource.name,
        type: resource.type,
        color: color
      };
    });
    
    return colorMap;
  }, [rooms, booths]);

  // Convertir reservas a eventos del calendario (con filtro)
  const calendarEvents = useMemo(() => {
    // Aplicar filtro de recursos si hay alguno seleccionado
    const filteredBookings = selectedResources.length > 0
      ? bookings.filter(b => selectedResources.includes(b.resource_id))
      : bookings;
    
    const bookingEvents = filteredBookings
      .filter(booking => booking.status !== 'cancelled')
      .map(booking => {
        const resourceInfo = resourceColorMap[booking.resource_id] || {
          name: booking.resource_name,
          color: '#6b7280'
        };

        const statusIcon = {
          'confirmed': '✓',
          'pending': '⏱',
          'blocked': '🔒'
        }[booking.status] || '';

        // Parsear fechas: usar start_datetime/end_datetime o combinar date + start_time/end_time
        const getStartDate = () => {
          if (booking.start_datetime) return new Date(booking.start_datetime);
          if (booking.date && booking.start_time) return new Date(`${booking.date}T${booking.start_time}`);
          return new Date();
        };

        const getEndDate = () => {
          if (booking.end_datetime) return new Date(booking.end_datetime);
          if (booking.date && booking.end_time) return new Date(`${booking.date}T${booking.end_time}`);
          return new Date();
        };

        return {
          id: booking.id,
          title: `${statusIcon} ${resourceInfo.name} - ${booking.client_name}`,
          start: getStartDate(),
          end: getEndDate(),
          resource: booking,
          resourceInfo: resourceInfo,
          isRequest: false
        };
      });
    
    // Aplicar filtro a solicitudes también
    const filteredRequests = selectedResources.length > 0
      ? pendingRequests.filter(r => r.details?.resource_id && selectedResources.includes(r.details.resource_id))
      : pendingRequests;
    
    const requestEvents = filteredRequests
      .filter(req => req.details?.start_time && req.details?.end_time)
      .map(request => {
        const resourceInfo = resourceColorMap[request.details.resource_id] || {
          name: request.details.resource_name || 'Recurso',
          color: '#6b7280'
        };
        
        return {
          id: `request-${request.id}`,
          title: `📋 SOLICITUD: ${resourceInfo.name} - ${request.client_name}`,
          start: new Date(request.details.start_time),
          end: new Date(request.details.end_time),
          resource: {
            ...request,
            resource_id: request.details.resource_id,
            resource_name: request.details.resource_name,
            resource_type: request.details.resource_type,
            status: 'request'
          },
          resourceInfo: resourceInfo,
          isRequest: true
        };
      });
    
    return [...bookingEvents, ...requestEvents];
  }, [bookings, pendingRequests, resourceColorMap, selectedResources]);

  // Estilos de eventos del calendario (usa colores de la leyenda)
  const eventPropGetter = (event) => {
    const booking = event.resource;
    const status = booking.status;
    const isRequest = event.isRequest;
    
    // Obtener color del recurso desde el mapa de colores
    const resourceData = resourceColorMap[booking.resource_id];
    const color = resourceData ? resourceData.color : '#6b7280';
    
    // Generar clase CSS basada en el nombre del recurso
    let className = '';
    const resourceName = booking.resource_name || '';
    
    if (resourceName.includes('Gran Apoquindo')) {
      className = 'sala-gran-apoquindo';
    } else if (resourceName.includes('iContel')) {
      className = 'sala-icontel';
    } else if (resourceName.includes('Badajoz')) {
      className = 'sala-badajoz';
    } else if (resourceName.includes('Rosario')) {
      className = 'sala-rosario';
    } else if (resourceName.includes('Caseta 1')) {
      className = 'caseta-1';
    } else if (resourceName.includes('Caseta 2')) {
      className = 'caseta-2';
    }
    
    // Estilo especial para solicitudes pendientes de aprobación
    if (isRequest) {
      return {
        className: 'solicitud-pendiente',
        style: {
          backgroundColor: '#ff8a00',
          border: '3px dashed #ff6600',
          borderRadius: '6px',
          opacity: 0.85,
          color: 'white',
          fontSize: '11px',
          fontWeight: '700',
          padding: '4px 6px',
          boxShadow: '0 2px 8px rgba(255, 138, 0, 0.4)',
          cursor: 'pointer',
          textShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }
      };
    }
    
    // Estilos base con el color del recurso
    let style = {
      backgroundColor: color,
      border: `4px solid ${color}`,
      borderRadius: '6px',
      opacity: 1,
      color: 'white',
      fontSize: '11px',
      fontWeight: '700',
      padding: '4px 6px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      cursor: 'pointer',
      textShadow: '0 1px 2px rgba(0,0,0,0.3)'
    };
    
    // Variaciones según el estado
    switch (status) {
      case 'confirmed':
        style.fontWeight = '700';
        break;
      case 'pending':
        style.opacity = 0.85;
        style.border = `3px dashed ${color}`;
        style.boxShadow = 'none';
        style.fontWeight = '600';
        break;
      case 'blocked':
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.4)`;
        style.opacity = 0.7;
        style.border = `2px dotted ${color}`;
        style.boxShadow = 'none';
        style.cursor = 'not-allowed';
        style.fontWeight = '600';
        break;
      default:
        break;
    }
    
    return {
      className: className,
      style: style
    };
  };

  // Leyenda de colores
  const legend = useMemo(() => {
    return Object.entries(resourceColorMap).map(([id, info]) => ({
      id,
      name: info.name,
      type: info.type,
      color: info.color
    }));
  }, [resourceColorMap]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-primary">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-container">
      {/* Header con botón Nueva Venta y UF */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-secondary text-4xl md:text-5xl font-black uppercase text-black tracking-tight">
            DASHBOARD
          </h1>
          <div className="h-1 w-32 tna-gradient mt-4"></div>
        </div>
        <div className="flex items-center gap-3">
          {/* Indicador UF */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-sm border border-gray-200">
            <div className="text-right">
              <p className="text-[10px] text-gray-500 font-primary uppercase">Valor UF</p>
              <p className="text-sm font-bold text-gray-800 font-primary">
                ${ufValue.value.toLocaleString('es-CL')}
              </p>
            </div>
            <button
              onClick={fetchUFValue}
              disabled={loadingUF}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
              title="Actualizar valor UF"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 ${loadingUF ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {user?.role !== 'comisionista' && (
            <Button
              onClick={() => navigate('/tickets?newSale=true')}
              className="bg-gradient-to-r from-[#FF8A00] to-[#FF3D3D] hover:from-[#FF9A20] hover:to-[#FF5D5D] text-white rounded-sm font-bold uppercase tracking-wide font-secondary shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Venta
            </Button>
          )}
        </div>
      </div>

      {/* Alertas de Contratos por Vencer */}
      {expiringContracts.length > 0 && (
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-sm shadow-lg">
          <CardHeader className="border-b border-orange-200 bg-gradient-to-r from-orange-100/50 to-red-100/50 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-secondary uppercase text-orange-800 flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-full animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="text-base">Contratos Próximos a Vencer</span>
                  <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full font-primary">
                    {expiringContracts.length}
                  </span>
                </div>
              </CardTitle>
              <button
                onClick={() => navigate('/clients')}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-sm text-xs font-primary font-medium transition-colors"
              >
                Ver clientes →
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-orange-100 max-h-[200px] overflow-y-auto">
              {expiringContracts.map((contract, index) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-all ${
                    contract.status === 'expired' ? 'bg-red-50 hover:bg-red-100' :
                    contract.status === 'critical' ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-yellow-50'
                  }`}
                  onClick={() => navigate('/clients')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      contract.status === 'expired' ? 'bg-red-500' :
                      contract.status === 'critical' ? 'bg-orange-500' : 'bg-yellow-500'
                    }`}>
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 font-primary">{contract.client_name}</p>
                      <p className="text-xs text-gray-600 font-primary truncate max-w-[250px]">{contract.document_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-primary font-bold text-xs ${
                      contract.status === 'expired' ? 'bg-red-500 text-white' :
                      contract.status === 'critical' ? 'bg-orange-500 text-white' : 'bg-yellow-400 text-yellow-900'
                    }`}>
                      {contract.status === 'expired' && <AlertTriangle className="w-3 h-3" />}
                      {contract.days_remaining < 0 
                        ? `Vencido hace ${Math.abs(contract.days_remaining)} días`
                        : contract.days_remaining === 0 
                          ? '¡Vence hoy!'
                          : `${contract.days_remaining} días`
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="bg-white border-gray-200 rounded-sm hover:border-[#FF8A00] transition-all duration-300 cursor-pointer group"
          onClick={() => navigate('/requests')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-200">
            <CardTitle className="text-sm font-secondary uppercase text-gray-600">Solicitudes</CardTitle>
            <div className="relative">
              <Bell 
                className={`w-5 h-5 transition-colors ${
                  stats?.new_requests > 0 ? 'text-[#FF8A00] animate-pulse' : 'text-gray-400'
                }`} 
                strokeWidth={1.5} 
              />
              {stats?.new_requests > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF8A00] rounded-full border-2 border-white"></span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-black font-primary group-hover:text-[#FF8A00] transition-colors" data-testid="new-requests">
              {stats?.new_requests || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1 font-primary">
              {stats?.new_requests > 0 ? 'Nuevas - Click para revisar' : 'Nuevas'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 rounded-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-primary uppercase">Ventas del Mes</p>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs bg-gray-100 border-0 rounded px-2 py-1 font-primary text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors"
              >
                {availableMonths.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-black font-secondary" data-testid="total-sales">{formatCurrency(salesMetrics.totalMonth)}</p>
                <p className="text-xs text-gray-400 font-primary">{salesMetrics.monthSalesCount} ventas</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-sm flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-white border-gray-200 rounded-sm cursor-pointer transition-all hover:shadow-md hover:border-amber-400"
          onClick={() => navigate('/tickets')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-primary uppercase">Pendientes de Pago</p>
                <p className="text-2xl font-bold text-black font-secondary">{formatCurrency(salesMetrics.totalPending)}</p>
                <p className="text-xs text-gray-400 font-primary">{salesMetrics.pendingCount} ventas • Click para ver</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-sm flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ventas por Categoría */}
      <Card className="bg-white border-gray-200 rounded-sm">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="font-secondary uppercase text-black">Ventas por Categoría</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {stats?.sales_by_category && Object.keys(stats.sales_by_category).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(stats.sales_by_category).map(([category, amount]) => (
                <div key={category} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-primary">{category}</span>
                    <span className="text-black font-semibold font-primary">{formatCurrency(amount)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full tna-gradient" 
                      style={{ width: `${(amount / stats.total_sales) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8 font-primary">No hay datos disponibles</p>
          )}
        </CardContent>
      </Card>

      {/* Calendario General Completo */}
      <Card className="bg-white border-gray-200 rounded-sm shadow-lg">
        <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="font-secondary uppercase text-xl text-gray-900">
                  CALENDARIO GENERAL
                </CardTitle>
                <p className="text-xs text-gray-600 font-primary mt-1">
                  Todas las reservas de salas y casetas
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/all-bookings')}
              className="text-xs"
            >
              Abrir en pantalla completa →
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          {/* Leyenda de recursos - clickeable para filtrar */}
          <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-secondary uppercase text-xs font-bold text-gray-700">
                Filtrar por Recurso: {selectedResources.length > 0 && `(${selectedResources.length} seleccionados)`}
              </h3>
              {selectedResources.length > 0 && (
                <button
                  onClick={clearResourceFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 font-primary underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {legend.map((item) => {
                const isSelected = selectedResources.includes(item.id);
                return (
                  <button 
                    key={item.id}
                    onClick={() => toggleResourceFilter(item.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-300' 
                        : selectedResources.length > 0 
                          ? 'bg-gray-100 border-gray-200 opacity-50 hover:opacity-100' 
                          : 'bg-white border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <div 
                      className="w-3 h-3 rounded" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className={`text-xs font-primary ${isSelected ? 'text-blue-800 font-semibold' : 'text-gray-700'}`}>
                      {item.name}
                    </span>
                    {isSelected && (
                      <span className="text-blue-600 ml-1">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedResources.length > 0 && (
              <p className="text-xs text-gray-500 mt-2 font-primary">
                💡 Click en los recursos para agregar/quitar del filtro
              </p>
            )}
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="text-xl font-bold text-green-600 font-primary">
                {bookings.filter(b => b.status === 'confirmed').length}
              </div>
              <div className="text-xs text-green-700 font-secondary uppercase">Confirmadas</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <div className="text-xl font-bold text-yellow-600 font-primary">
                {bookings.filter(b => b.status === 'pending').length}
              </div>
              <div className="text-xs text-yellow-700 font-secondary uppercase">Pendientes</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
              <div className="text-xl font-bold text-orange-600 font-primary">
                {pendingRequests.length}
              </div>
              <div className="text-xs text-orange-700 font-secondary uppercase">Por Aprobar</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="text-xl font-bold text-gray-600 font-primary">
                {bookings.filter(b => b.status === 'blocked').length}
              </div>
              <div className="text-xs text-gray-700 font-secondary uppercase">Bloqueadas</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-xl font-bold text-blue-600 font-primary">
                {rooms.length + booths.length}
              </div>
              <div className="text-xs text-blue-700 font-secondary uppercase">Recursos</div>
            </div>
          </div>

          {/* Calendario con Drag and Drop */}
          <div style={{ height: '550px' }}>
            <DragAndDropCalendar
              key={`calendar-${bookings.length}-${rooms.length}`}
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              eventPropGetter={eventPropGetter}
              views={['month', 'week', 'day', 'agenda']}
              defaultView="week"
              min={new Date(2024, 0, 1, 8, 0, 0)}
              max={new Date(2024, 0, 1, 19, 0, 0)}
              draggableAccessor={(event) => event.resource.status !== 'blocked'}
              resizable
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              onSelectSlot={handleSelectSlot}
              selectable
              messages={{
                next: "Siguiente",
                previous: "Anterior",
                today: "Hoy",
                month: "Mes",
                week: "Semana",
                day: "Día",
                agenda: "Agenda",
                date: "Fecha",
                time: "Hora",
                event: "Evento",
                allDay: "Todo el día",
                noEventsInRange: "Sin reservas en este rango",
                showMore: (total) => `+${total} más`
              }}
              onSelectEvent={(event) => {
                if (event.isRequest) {
                  toast.info('Redirigiendo a solicitudes para aprobar/rechazar...', { duration: 2000 });
                  navigate('/requests');
                } else {
                  handleEditBooking(event.resource);
                }
              }}
              popup
            />
          </div>

          {/* Leyenda de estados e instrucciones */}
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap gap-4 text-sm font-primary bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded border-4 border-green-500"></div>
                <span className="text-gray-700 font-semibold">✓ Confirmada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded border-2 border-dashed border-yellow-500"></div>
                <span className="text-gray-700 font-semibold">⏱ Pendiente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded border-2 border-dashed border-orange-600"></div>
                <span className="text-gray-700 font-semibold">📋 Solicitud por Aprobar</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-400 opacity-50 rounded border-2 border-dotted border-gray-400"></div>
                <span className="text-gray-700 font-semibold">🔒 Bloqueada</span>
              </div>
            </div>
            <div className="text-sm font-primary bg-orange-50 p-3 rounded-lg border border-orange-200 text-gray-700">
              💡 <span className="font-semibold">Guía rápida:</span> 
              Click en evento para editar • Arrastra para mover • Redimensiona desde esquinas • Selecciona rango para crear nueva
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal para crear nueva reserva */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl">
              Nueva Reserva
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="font-primary text-sm font-semibold">Tipo de Recurso *</Label>
              <Select
                value={bookingForm.resource_type}
                onValueChange={(value) => {
                  setBookingForm({ ...bookingForm, resource_type: value, resource_id: '' });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="room">Sala</SelectItem>
                  <SelectItem value="booth">Caseta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bookingForm.resource_type && (
              <div>
                <Label className="font-primary text-sm font-semibold">
                  {bookingForm.resource_type === 'room' ? 'Sala' : 'Caseta'} *
                </Label>
                <Select
                  value={bookingForm.resource_id}
                  onValueChange={(value) => {
                    const resource = (bookingForm.resource_type === 'room' ? rooms : booths)
                      .find(r => r.id === value);
                    setBookingForm({ 
                      ...bookingForm, 
                      resource_id: value,
                      resource_name: resource?.name || ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona recurso" />
                  </SelectTrigger>
                  <SelectContent>
                    {(bookingForm.resource_type === 'room' ? rooms : booths).map((resource) => (
                      <SelectItem key={resource.id} value={resource.id}>
                        {resource.name} ({resource.capacity} personas)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="font-primary text-sm font-semibold">Nombre del Cliente *</Label>
              <Input
                value={bookingForm.client_name}
                onChange={(e) => setBookingForm({ ...bookingForm, client_name: e.target.value })}
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div>
              <Label className="font-primary text-sm font-semibold">Email *</Label>
              <Input
                type="email"
                value={bookingForm.client_email}
                onChange={(e) => setBookingForm({ ...bookingForm, client_email: e.target.value })}
                placeholder="ejemplo@email.com"
              />
            </div>

            <div>
              <Label className="font-primary text-sm font-semibold">Teléfono</Label>
              <Input
                value={bookingForm.client_phone}
                onChange={(e) => setBookingForm({ ...bookingForm, client_phone: e.target.value })}
                placeholder="+56 9 XXXX XXXX"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-primary text-sm font-semibold">Inicio *</Label>
                <Input
                  type="datetime-local"
                  value={bookingForm.start_time}
                  onChange={(e) => setBookingForm({ ...bookingForm, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label className="font-primary text-sm font-semibold">Fin *</Label>
                <Input
                  type="datetime-local"
                  value={bookingForm.end_time}
                  onChange={(e) => setBookingForm({ ...bookingForm, end_time: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label className="font-primary text-sm font-semibold">Notas</Label>
              <Input
                value={bookingForm.notes}
                onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                placeholder="Información adicional (opcional)"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCreateBooking}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-secondary uppercase"
              >
                <Save className="w-4 h-4 mr-2" />
                Crear Reserva
              </Button>
              <Button
                onClick={() => setShowBookingModal(false)}
                variant="outline"
                className="font-secondary uppercase"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para editar reserva */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-2xl text-gray-900 flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <Save className="w-5 h-5 text-white" />
              </div>
              Editar Reserva
            </DialogTitle>
          </DialogHeader>
          
          {editingBooking && (
            <div className="space-y-4 pt-4">
              <div>
                <Label className="font-primary text-sm font-semibold text-gray-700">Tipo de Recurso *</Label>
                <Select
                  value={bookingForm.resource_type}
                  onValueChange={(value) => {
                    setBookingForm({ ...bookingForm, resource_type: value, resource_id: '', resource_name: '' });
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="room">🏢 Sala</SelectItem>
                    <SelectItem value="booth">📞 Caseta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {bookingForm.resource_type && (
                <div>
                  <Label className="font-primary text-sm font-semibold text-gray-700">
                    {bookingForm.resource_type === 'room' ? '🏢 Sala' : '📞 Caseta'} *
                  </Label>
                  <Select
                    value={bookingForm.resource_id}
                    onValueChange={(value) => {
                      const resource = (bookingForm.resource_type === 'room' ? rooms : booths)
                        .find(r => r.id === value);
                      setBookingForm({ 
                        ...bookingForm, 
                        resource_id: value,
                        resource_name: resource?.name || ''
                      });
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecciona recurso" />
                    </SelectTrigger>
                    <SelectContent>
                      {(bookingForm.resource_type === 'room' ? rooms : booths).map((resource) => (
                        <SelectItem key={resource.id} value={resource.id}>
                          {resource.name} ({resource.capacity} personas)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {bookingForm.resource_id !== editingBooking.resource_id && (
                    <p className="text-xs text-orange-600 mt-1 font-primary">
                      ⚠️ Al cambiar el recurso se cancelará la reserva actual y se creará una nueva
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label className="font-primary text-sm font-semibold text-gray-700">Estado de la Reserva *</Label>
                <Select
                  value={bookingForm.status}
                  onValueChange={(value) => setBookingForm({ ...bookingForm, status: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">⏱ Pendiente de Confirmación</SelectItem>
                    <SelectItem value="confirmed">✓ Confirmada</SelectItem>
                    <SelectItem value="cancelled">✗ Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t border-gray-200 my-4"></div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-secondary uppercase text-sm font-bold text-blue-900 mb-3">
                  Datos del Cliente
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label className="font-primary text-xs font-semibold text-gray-600">Nombre *</Label>
                    <Input
                      value={bookingForm.client_name}
                      onChange={(e) => setBookingForm({ ...bookingForm, client_name: e.target.value })}
                      placeholder="Ej: Juan Pérez"
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="font-primary text-xs font-semibold text-gray-600">Email *</Label>
                      <Input
                        type="email"
                        value={bookingForm.client_email}
                        onChange={(e) => setBookingForm({ ...bookingForm, client_email: e.target.value })}
                        placeholder="ejemplo@email.com"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="font-primary text-xs font-semibold text-gray-600">Teléfono</Label>
                      <Input
                        value={bookingForm.client_phone}
                        onChange={(e) => setBookingForm({ ...bookingForm, client_phone: e.target.value })}
                        placeholder="+56 9 XXXX XXXX"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-secondary uppercase text-sm font-bold text-green-900 mb-3">
                  Fechas y Horarios
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-primary text-xs font-semibold text-gray-600">Inicio *</Label>
                    <Input
                      type="datetime-local"
                      value={bookingForm.start_time}
                      onChange={(e) => setBookingForm({ ...bookingForm, start_time: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="font-primary text-xs font-semibold text-gray-600">Fin *</Label>
                    <Input
                      type="datetime-local"
                      value={bookingForm.end_time}
                      onChange={(e) => setBookingForm({ ...bookingForm, end_time: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="font-primary text-sm font-semibold text-gray-700">Notas adicionales</Label>
                <Input
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  placeholder="Información adicional (opcional)"
                  className="mt-1"
                />
              </div>

              <div className="border-t border-gray-200 my-4"></div>

              <div className="flex gap-3">
                <Button
                  onClick={handleUpdateBooking}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-secondary uppercase py-6 shadow-lg"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </Button>
                <Button
                  onClick={handleDeleteBooking}
                  variant="destructive"
                  className="px-6 font-secondary uppercase"
                >
                  Cancelar Reserva
                </Button>
              </div>
              <Button
                onClick={() => setShowEditModal(false)}
                variant="outline"
                className="w-full font-secondary uppercase"
              >
                <X className="w-4 h-4 mr-2" />
                Cerrar sin Guardar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
