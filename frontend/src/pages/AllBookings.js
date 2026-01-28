import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import '../styles/calendar-custom.css';
import { CalendarDays, Save, X } from 'lucide-react';
import { toast } from 'sonner';

moment.locale('es');
const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop(Calendar);

// Paleta de colores para diferenciar recursos
const COLORS = [
  '#10b981', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
  '#84cc16', // lime
  '#a855f7', // violet
];

export const AllBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [booths, setBooths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [roomsRes, boothsRes, bookingsRes, requestsRes] = await Promise.all([
        apiClient.get('/rooms'),
        apiClient.get('/booths'),
        apiClient.get('/bookings'),
        apiClient.get('/requests')
      ]);
      
      setRooms(roomsRes.data);
      setBooths(boothsRes.data);
      setBookings(bookingsRes.data);
      
      // Filtrar solicitudes de reserva pendientes (status "new")
      const bookingRequests = requestsRes.data.filter(
        r => r.request_type === 'booking' && r.status === 'new'
      );
      setPendingRequests(bookingRequests);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // Manejar movimiento de evento (drag and drop)
  const handleEventDrop = async ({ event, start, end }) => {
    const booking = event.resource;
    
    // No permitir mover reservas bloqueadas
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
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al mover la reserva');
      console.error('Error:', error);
    }
  };

  // Manejar redimensionamiento de evento
  const handleEventResize = async ({ event, start, end }) => {
    const booking = event.resource;
    
    // No permitir redimensionar reservas bloqueadas
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
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al redimensionar la reserva');
      console.error('Error:', error);
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
      await apiClient.post('/bookings', {
        ...bookingForm,
        resource_name: bookingForm.resource_name || 
          [...rooms, ...booths].find(r => r.id === bookingForm.resource_id)?.name
      });
      
      toast.success('Reserva creada exitosamente');
      setShowBookingModal(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear la reserva');
      console.error('Error:', error);
    }
  };

  // Abrir modal de edición
  const handleEditBooking = (booking) => {
    if (booking.status === 'blocked') {
      toast.error('No puedes editar reservas bloqueadas automáticamente');
      return;
    }

    setEditingBooking(booking);
    setBookingForm({
      resource_type: booking.resource_type,
      resource_id: booking.resource_id,
      resource_name: booking.resource_name,
      client_name: booking.client_name,
      client_email: booking.client_email,
      client_phone: booking.client_phone || '',
      start_time: moment(booking.start_time).format('YYYY-MM-DDTHH:mm'),
      end_time: moment(booking.end_time).format('YYYY-MM-DDTHH:mm'),
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
      // Si se cambió el recurso, necesitamos crear una nueva reserva y cancelar la antigua
      if (bookingForm.resource_id !== editingBooking.resource_id) {
        // Cancelar la reserva antigua
        await apiClient.put(`/bookings/${editingBooking.id}`, {
          status: 'cancelled'
        });
        
        // Crear nueva reserva con el nuevo recurso
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
        // Actualizar reserva existente
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
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar la reserva');
      console.error('Error:', error);
    }
  };

  // Cancelar/eliminar reserva
  const handleDeleteBooking = async () => {
    if (!window.confirm('¿Estás seguro de que quieres cancelar esta reserva?')) {
      return;
    }

    try {
      await apiClient.put(`/bookings/${editingBooking.id}`, {
        status: 'cancelled'
      });
      
      toast.success('Reserva cancelada exitosamente');
      setShowEditModal(false);
      setEditingBooking(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cancelar la reserva');
      console.error('Error:', error);
    }
  };

  // Crear un mapa de recursos con colores asignados
  const resourceColorMap = useMemo(() => {
    const allResources = [
      ...rooms.map(r => ({ id: r.id, name: r.name, type: 'room' })),
      ...booths.map(b => ({ id: b.id, name: b.name, type: 'booth' }))
    ];
    
    const colorMap = {};
    allResources.forEach((resource, index) => {
      // Asignar color base del array
      let color = COLORS[index % COLORS.length];
      
      // Sobrescribir con colores especiales para salas específicas
      if (resource.name && resource.name.includes('Gran Apoquindo')) {
        color = '#c084fc'; // Lila específico para Gran Apoquindo
      } else if (resource.name && resource.name.includes('iContel')) {
        color = '#fbbf24'; // Amarillo específico para iContel
      }
      
      colorMap[resource.id] = {
        name: resource.name,
        type: resource.type,
        color: color
      };
    });
    
    return colorMap;
  }, [rooms, booths]);

  // Convertir reservas a eventos del calendario
  const calendarEvents = useMemo(() => {
    // Eventos de reservas confirmadas/pendientes/bloqueadas
    const bookingEvents = bookings
      .filter(booking => booking.status !== 'cancelled')
      .map(booking => {
        const resourceInfo = resourceColorMap[booking.resource_id] || {
          name: booking.resource_name,
          color: '#6b7280'
        };
        
        // Icono según estado
        const statusIcon = {
          'confirmed': '✓',
          'pending': '⏱',
          'blocked': '🔒'
        }[booking.status] || '';
        
        return {
          id: booking.id,
          title: `${statusIcon} ${resourceInfo.name} - ${booking.client_name}`,
          start: new Date(booking.start_time),
          end: new Date(booking.end_time),
          resource: booking,
          resourceInfo: resourceInfo,
          isRequest: false
        };
      });
    
    // Eventos de solicitudes pendientes de aprobación
    const requestEvents = pendingRequests
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
  }, [bookings, pendingRequests, resourceColorMap]);

  // Función para asignar clases CSS personalizadas a los eventos
  const eventPropGetter = (event) => {
    const booking = event.resource;
    const resourceName = booking.resource_name || '';
    
    // Generar clase CSS basada en el nombre del recurso
    let className = 'rbc-event ';
    
    if (resourceName.includes('Gran Apoquindo')) {
      className += 'sala-gran-apoquindo';
    } else if (resourceName.includes('iContel')) {
      className += 'sala-icontel';
    } else if (resourceName.includes('Badajoz')) {
      className += 'sala-badajoz';
    } else if (resourceName.includes('Rosario')) {
      className += 'sala-rosario';
    } else if (resourceName.includes('Caseta 1')) {
      className += 'caseta-1';
    } else if (resourceName.includes('Caseta 2')) {
      className += 'caseta-2';
    }
    
    return {
      className: className
    };
  };

  const eventStyleGetter = (event) => {
    const booking = event.resource;
    const status = booking.status;
    const isRequest = event.isRequest;
    
    // Obtener el color desde resourceColorMap usando el resource_id del booking
    const resourceData = resourceColorMap[booking.resource_id];
    let color = resourceData ? resourceData.color : '#6b7280';
    
    // Asegurar colores especiales directamente
    if (booking.resource_name && booking.resource_name.includes('Gran Apoquindo')) {
      color = '#c084fc'; // Lila
    } else if (booking.resource_name && booking.resource_name.includes('iContel')) {
      color = '#fbbf24'; // Amarillo
    }
    
    // Estilos base
    let backgroundColor = color;
    let borderStyle = `3px solid ${color}`;
    let opacity = 1;
    
    // Estilo especial para solicitudes pendientes de aprobación
    if (isRequest) {
      return {
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
          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          animation: 'pulse 2s infinite'
        }
      };
    }
    
    // Ajustar según estado
    switch (status) {
      case 'confirmed':
        // Confirmada: color sólido con borde grueso
        backgroundColor = color;
        borderStyle = `4px solid ${color}`;
        opacity = 1;
        break;
      case 'pending':
        // Pendiente: borde punteado
        backgroundColor = color;
        opacity = 0.9;
        borderStyle = `3px dashed ${color}`;
        break;
      case 'blocked':
        // Bloqueada: semi-transparente
        // Convertir hex a rgba manualmente si es necesario
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        backgroundColor = `rgba(${r}, ${g}, ${b}, 0.3)`;
        opacity = 0.6;
        borderStyle = `2px dotted ${color}`;
        break;
      default:
        backgroundColor = color;
    }
    
    return {
      style: {
        backgroundColor: `${backgroundColor} !important`,
        border: `${borderStyle} !important`,
        borderRadius: '6px',
        opacity: opacity,
        color: 'white',
        fontSize: '11px',
        fontWeight: status === 'confirmed' ? '700' : '600',
        padding: '4px 6px',
        boxShadow: status === 'confirmed' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
        cursor: status === 'blocked' ? 'not-allowed' : 'pointer',
        textShadow: '0 1px 2px rgba(0,0,0,0.3)'
      }
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-primary">Cargando calendario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <Card className="bg-white border-gray-200 shadow-lg">
        <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="font-secondary uppercase text-2xl text-gray-900">
                CALENDARIO UNIFICADO DE RESERVAS
              </CardTitle>
              <p className="text-sm text-gray-600 font-primary mt-1">
                Todas las reservas de salas y casetas en un solo calendario
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Leyenda de colores */}
          <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-secondary uppercase text-sm font-bold text-gray-700 mb-3">
              Leyenda de Recursos:
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {legend.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200"
                >
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-xs font-primary text-gray-700 truncate">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600 font-primary">
                {bookings.filter(b => b.status === 'confirmed').length}
              </div>
              <div className="text-xs text-green-700 font-secondary uppercase">
                Confirmadas
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600 font-primary">
                {bookings.filter(b => b.status === 'pending').length}
              </div>
              <div className="text-xs text-yellow-700 font-secondary uppercase">
                Pendientes
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-600 font-primary">
                {pendingRequests.length}
              </div>
              <div className="text-xs text-orange-700 font-secondary uppercase">
                Solicitudes por Aprobar
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-600 font-primary">
                {bookings.filter(b => b.status === 'blocked').length}
              </div>
              <div className="text-xs text-gray-700 font-secondary uppercase">
                Bloqueadas
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600 font-primary">
                {rooms.length + booths.length}
              </div>
              <div className="text-xs text-blue-700 font-secondary uppercase">
                Total Recursos
              </div>
            </div>
          </div>

          {/* Calendario con Drag and Drop */}
          <div style={{ height: '700px' }}>
            <DragAndDropCalendar
              key={`calendar-${bookings.length}-${rooms.length}`}
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              eventStyleGetter={eventStyleGetter}
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
                  // Es una solicitud pendiente - navegar a la página de solicitudes
                  toast.info('Redirigiendo a solicitudes para aprobar/rechazar...', {
                    duration: 2000
                  });
                  navigate('/requests');
                } else {
                  // Es una reserva normal - abrir modal de edición
                  handleEditBooking(event.resource);
                }
              }}
              popup
            />
          </div>

          {/* Info adicional */}
          <div className="mt-4 space-y-3">
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
            {/* Tipo de recurso */}
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

            {/* Recurso específico */}
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

            {/* Nombre del cliente */}
            <div>
              <Label className="font-primary text-sm font-semibold">Nombre del Cliente *</Label>
              <Input
                value={bookingForm.client_name}
                onChange={(e) => setBookingForm({ ...bookingForm, client_name: e.target.value })}
                placeholder="Ej: Juan Pérez"
              />
            </div>

            {/* Email */}
            <div>
              <Label className="font-primary text-sm font-semibold">Email *</Label>
              <Input
                type="email"
                value={bookingForm.client_email}
                onChange={(e) => setBookingForm({ ...bookingForm, client_email: e.target.value })}
                placeholder="ejemplo@email.com"
              />
            </div>

            {/* Teléfono */}
            <div>
              <Label className="font-primary text-sm font-semibold">Teléfono</Label>
              <Input
                value={bookingForm.client_phone}
                onChange={(e) => setBookingForm({ ...bookingForm, client_phone: e.target.value })}
                placeholder="+56 9 XXXX XXXX"
              />
            </div>

            {/* Fechas */}
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

            {/* Notas */}
            <div>
              <Label className="font-primary text-sm font-semibold">Notas</Label>
              <Input
                value={bookingForm.notes}
                onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                placeholder="Información adicional (opcional)"
              />
            </div>

            {/* Botones */}
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
            <p className="text-sm text-gray-600 font-primary mt-2">
              Modifica los detalles de la reserva o cambia el recurso asignado
            </p>
          </DialogHeader>
          
          {editingBooking && (
            <div className="space-y-4 pt-4">
              {/* Tipo de recurso */}
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

              {/* Recurso específico */}
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

              {/* Estado */}
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

              {/* Separador */}
              <div className="border-t border-gray-200 my-4"></div>

              {/* Información del cliente */}
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

              {/* Fechas y horarios */}
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

              {/* Notas */}
              <div>
                <Label className="font-primary text-sm font-semibold text-gray-700">Notas adicionales</Label>
                <Input
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  placeholder="Información adicional (opcional)"
                  className="mt-1"
                />
              </div>

              {/* Separador */}
              <div className="border-t border-gray-200 my-4"></div>

              {/* Botones */}
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
