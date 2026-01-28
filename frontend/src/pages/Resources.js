import { useState, useEffect, useMemo } from 'react';
import apiClient from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Users, Calendar as CalendarIcon, CheckCircle, XCircle, Edit, Trash2, Plus, Building2, Phone, Image as ImageIcon, Upload, Search, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';

moment.locale('es');
const localizer = momentLocalizer(moment);

export const Resources = () => {
  const [rooms, setRooms] = useState([]);
  const [booths, setBooths] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [editingResource, setEditingResource] = useState(null);
  const [resourceType, setResourceType] = useState('room'); // 'room' or 'booth'
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'rooms', 'booths'
  
  // Estados para búsqueda de cliente
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSelectionMode, setClientSelectionMode] = useState('search'); // 'search', 'new', 'manual'
  const [selectedClient, setSelectedClient] = useState(null);
  
  const [bookingForm, setBookingForm] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    client_id: null,
    start_time: '',
    end_time: '',
    notes: ''
  });

  // Formulario para nuevo cliente
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });

  const [editForm, setEditForm] = useState({
    name: '',
    capacity: '',
    description: '',
    image_url: ''
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [roomsRes, boothsRes, bookingsRes, clientsRes] = await Promise.all([
        apiClient.get('/rooms'),
        apiClient.get('/booths'),
        apiClient.get('/bookings'),
        apiClient.get('/clients')
      ]);
      setRooms(roomsRes.data);
      setBooths(boothsRes.data);
      setBookings(bookingsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    }
  };

  // Filtrar clientes según búsqueda
  const filteredClients = useMemo(() => {
    if (!clientSearchTerm.trim()) return [];
    return clients.filter(client => 
      client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
      (client.company && client.company.toLowerCase().includes(clientSearchTerm.toLowerCase()))
    ).slice(0, 5);
  }, [clients, clientSearchTerm]);

  // Seleccionar cliente existente
  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setBookingForm({
      ...bookingForm,
      client_name: client.name,
      client_email: client.email,
      client_phone: client.phone || '',
      client_id: client.id
    });
    setClientSearchTerm(client.name);
    setShowClientDropdown(false);
    setClientSelectionMode('search');
  };

  // Usar nombre manual (sin cliente)
  const handleUseManualName = () => {
    setSelectedClient(null);
    setBookingForm({
      ...bookingForm,
      client_name: clientSearchTerm,
      client_email: '',
      client_phone: '',
      client_id: null
    });
    setShowClientDropdown(false);
    setClientSelectionMode('manual');
  };

  // Crear nuevo cliente
  const handleCreateNewClient = async () => {
    if (!newClientForm.name || !newClientForm.email) {
      toast.error('Nombre y email son requeridos');
      return;
    }
    
    try {
      const response = await apiClient.post('/clients', newClientForm);
      const newClient = response.data;
      
      // Actualizar lista de clientes
      setClients(prev => [...prev, newClient]);
      
      // Seleccionar el nuevo cliente
      handleSelectClient(newClient);
      
      // Cerrar modal y resetear formulario
      setShowNewClientModal(false);
      setNewClientForm({ name: '', email: '', phone: '', company: '' });
      toast.success('Cliente creado exitosamente');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear cliente');
    }
  };

  // Reset del formulario de reserva
  const resetBookingForm = () => {
    setBookingForm({
      client_name: '',
      client_email: '',
      client_phone: '',
      client_id: null,
      start_time: '',
      end_time: '',
      notes: ''
    });
    setClientSearchTerm('');
    setSelectedClient(null);
    setClientSelectionMode('search');
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/bookings', {
        ...bookingForm,
        resource_type: resourceType,
        resource_id: selectedResource.id,
        resource_name: selectedResource.name
      });
      toast.success('Reserva creada exitosamente');
      setShowBookingModal(false);
      resetBookingForm();
      loadData();
    } catch (error) {
      toast.error('Error al crear reserva');
    }
  };

  const handleEditResource = (resource, type) => {
    setEditingResource(resource);
    setResourceType(type);
    setEditForm({
      name: resource.name,
      capacity: resource.capacity?.toString() || '',
      description: resource.description || '',
      image_url: resource.image_url || ''
    });
    setShowEditModal(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen es muy grande. Máximo 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }

    setUploadingImage(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          // Convert to base64
          const base64Image = event.target.result;
          
          // Update form with base64 image
          setEditForm({ ...editForm, image_url: base64Image });
          toast.success('Imagen cargada exitosamente');
        } catch (error) {
          toast.error('Error al procesar imagen');
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Error al cargar imagen');
      setUploadingImage(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = resourceType === 'room' ? 'rooms' : 'booths';
      const updateData = {
        name: editForm.name,
        description: editForm.description,
        image_url: editForm.image_url,
        ...(editForm.capacity && { capacity: parseInt(editForm.capacity) })
      };
      
      await apiClient.put(`/${endpoint}/${editingResource.id}`, updateData);
      toast.success('Recurso actualizado exitosamente');
      setShowEditModal(false);
      setEditingResource(null);
      loadData();
    } catch (error) {
      toast.error('Error al actualizar recurso');
    }
  };

  const handleDeleteResource = async (resource, type) => {
    if (!window.confirm(`¿Estás seguro de eliminar ${resource.name}?`)) return;
    
    try {
      const endpoint = type === 'room' ? 'rooms' : 'booths';
      await apiClient.delete(`/${endpoint}/${resource.id}`);
      toast.success('Recurso eliminado exitosamente');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar recurso');
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await apiClient.put(`/bookings/${bookingId}?status=${status}`);
      toast.success('Estado actualizado');
      loadData();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const getResourceBookings = (resourceId) => {
    return bookings.filter(b => b.resource_id === resourceId);
  };

  const calendarEvents = useMemo(() => {
    if (!selectedResource) return [];
    
    return getResourceBookings(selectedResource.id).map(booking => {
      // Helper para parsear fechas que pueden venir en diferentes formatos
      const parseBookingDate = (dateStr, timeStr) => {
        // Si ya es una fecha ISO completa, usarla directamente
        if (dateStr && dateStr.includes('T')) {
          return new Date(dateStr);
        }
        // Si hay fecha y hora separadas (formato MariaDB)
        if (booking.date && timeStr) {
          return new Date(`${booking.date}T${timeStr}`);
        }
        // Fallback: intentar parsear directamente
        return new Date(dateStr);
      };

      return {
        id: booking.id,
        title: `${booking.client_name} - ${booking.status}`,
        start: parseBookingDate(booking.start_time, booking.start_time),
        end: parseBookingDate(booking.end_time, booking.end_time),
        resource: booking,
        style: {
          backgroundColor: booking.status === 'confirmed' ? '#10b981' : 
                          booking.status === 'pending' ? '#f59e0b' : '#ef4444'
        }
      };
    });
  }, [selectedResource, bookings]);

  const eventStyleGetter = (event) => {
    return {
      style: event.style
    };
  };

  // Filter resources based on active tab
  const filteredResources = useMemo(() => {
    const allResources = [
      ...rooms.map(r => ({ ...r, type: 'room', typeLabel: 'Sala' })),
      ...booths.map(b => ({ ...b, type: 'booth', typeLabel: 'Caseta' }))
    ];

    if (activeTab === 'rooms') {
      return allResources.filter(r => r.type === 'room');
    } else if (activeTab === 'booths') {
      return allResources.filter(r => r.type === 'booth');
    }
    return allResources;
  }, [rooms, booths, activeTab]);

  // Renderizado específico para casetas (diseño minimalista)
  const renderBoothCard = (booth) => (
    <Card key={booth.id} className="bg-gradient-to-br from-purple-50 to-white border-purple-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <CardContent className="p-6">
        {/* Header minimalista con icono moderno */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Icono moderno de caseta telefónica */}
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            
            {/* Nombre y badge */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 font-secondary uppercase mb-1">
                {booth.name}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1 bg-purple-600 text-white rounded-full font-primary font-semibold uppercase tracking-wide">
                  Caseta Telefónica
                </span>
                {booth.capacity && (
                  <span className="text-sm text-gray-600 font-primary flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {booth.capacity}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Imagen pequeña opcional */}
          {booth.image_url && (
            <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-purple-200 shadow-sm">
              <img 
                src={booth.image_url} 
                alt={booth.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        {/* Descripción minimalista */}
        {booth.description && (
          <p className="text-gray-600 font-primary text-sm mb-6 leading-relaxed">
            {booth.description}
          </p>
        )}

        {/* Próximas reservas (más compacto) */}
        <div className="space-y-2 mb-6">
          <div className="text-xs font-secondary uppercase text-gray-500 tracking-wider">Próximas reservas</div>
          {getResourceBookings(booth.id).slice(0, 2).map((booking) => {
            // Parsear fecha de forma robusta
            const getDisplayDate = () => {
              try {
                // Si es fecha ISO completa
                if (booking.start_time && booking.start_time.includes('T')) {
                  return new Date(booking.start_time).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                }
                // Si hay fecha y hora separadas (MariaDB)
                if (booking.date && booking.start_time) {
                  return new Date(`${booking.date}T${booking.start_time}`).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                }
                // Fallback
                return booking.date || booking.start_time || 'Fecha no disponible';
              } catch {
                return 'Fecha no disponible';
              }
            };
            
            return (
            <div key={booking.id} className="bg-white p-3 rounded-lg border border-purple-100 flex items-center justify-between hover:border-purple-300 transition-colors">
              <div className="flex-1">
                <div className="text-gray-900 font-primary font-medium text-sm">{booking.client_name}</div>
                <div className="text-gray-500 text-xs font-primary">
                  {getDisplayDate()}
                </div>
              </div>
              <div className="flex gap-2">
                {booking.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                      className="bg-green-600 hover:bg-green-700 text-white rounded-lg h-8 w-8 p-0"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                      className="bg-red-600 hover:bg-red-700 text-white rounded-lg h-8 w-8 p-0"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {booking.status === 'confirmed' && (
                  <span className="text-xs text-green-600 font-primary font-semibold px-2 py-1 bg-green-50 rounded-full">✓ Confirmada</span>
                )}
              </div>
            </div>
          );})}
          {getResourceBookings(booth.id).length === 0 && (
            <div className="text-center py-4 bg-purple-50 rounded-lg border border-purple-100">
              <p className="text-purple-400 text-xs font-primary italic">Sin reservas programadas</p>
            </div>
          )}
        </div>

        {/* Botones de acción minimalistas */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => {
              setSelectedResource(booth);
              setResourceType(booth.type);
              setShowCalendarModal(true);
            }}
            className="bg-white border-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-400 rounded-lg font-secondary text-xs uppercase tracking-wide transition-all"
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            Ver Calendario
          </Button>
          <Button
            onClick={() => {
              setSelectedResource(booth);
              setResourceType(booth.type);
              setShowBookingModal(true);
            }}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 rounded-lg font-secondary text-xs uppercase tracking-wide shadow-md transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Reserva
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Button
            onClick={() => handleEditResource(booth, 'booth')}
            variant="outline"
            size="sm"
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-secondary text-xs"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button
            onClick={() => handleDeleteResource(booth, 'booth')}
            variant="outline"
            size="sm"
            className="bg-white border border-red-300 text-red-600 hover:bg-red-50 rounded-lg font-secondary text-xs"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Renderizado para salas (mantiene diseño original)
  const renderRoomCard = (room) => (
    <Card key={room.id} className="bg-white border-gray-200 rounded-sm overflow-hidden">
      {/* Resource Image */}
      {room.image_url && (
        <div className="h-48 overflow-hidden bg-gray-100">
          <img 
            src={room.image_url} 
            alt={room.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = '<div class="flex items-center justify-center h-full bg-gray-100"><span class="text-gray-400">Sin imagen</span></div>';
            }}
          />
        </div>
      )}
      
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="font-secondary uppercase text-black flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>{room.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-primary normal-case">
              {room.typeLabel}
            </span>
            {room.capacity && (
              <span className="text-sm text-gray-600 font-primary normal-case flex items-center gap-1">
                <Users className="w-4 h-4" />
                {room.capacity} {room.capacity === 1 ? 'persona' : 'personas'}
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-gray-600 font-primary text-sm mb-4 min-h-[40px]">
          {room.description || 'Sin descripción'}
        </p>
        
        <div className="space-y-2 mb-4">
          <div className="text-sm font-secondary uppercase text-black">Próximas reservas:</div>
          {getResourceBookings(room.id).slice(0, 3).map((booking) => {
            // Parsear fecha de forma robusta
            const getDisplayDate = () => {
              try {
                // Si es fecha ISO completa
                if (booking.start_time && booking.start_time.includes('T')) {
                  return new Date(booking.start_time).toLocaleString('es-CL');
                }
                // Si hay fecha y hora separadas (MariaDB)
                if (booking.date && booking.start_time) {
                  return new Date(`${booking.date}T${booking.start_time}`).toLocaleString('es-CL');
                }
                // Fallback
                return booking.date || booking.start_time || 'Fecha no disponible';
              } catch {
                return 'Fecha no disponible';
              }
            };

            return (
            <div key={booking.id} className="bg-gray-50 p-3 rounded-sm border border-gray-200 flex items-center justify-between">
              <div>
                <div className="text-black font-primary text-sm">{booking.client_name}</div>
                <div className="text-gray-500 text-xs font-primary">
                  {getDisplayDate()}
                </div>
              </div>
              <div className="flex gap-2">
                {booking.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                      className="bg-green-600 hover:bg-green-700 text-white rounded-sm h-8 w-8 p-0"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                      className="bg-red-600 hover:bg-red-700 text-white rounded-sm h-8 w-8 p-0"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {booking.status === 'confirmed' && (
                  <span className="text-xs text-green-600 font-primary font-semibold">Confirmada</span>
                )}
                {booking.status === 'cancelled' && (
                  <span className="text-xs text-red-600 font-primary">Cancelada</span>
                )}
              </div>
            </div>
          );})}
          {getResourceBookings(room.id).length === 0 && (
            <p className="text-gray-400 text-xs font-primary italic">Sin reservas</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setSelectedResource(room);
                setResourceType(room.type);
                setShowCalendarModal(true);
              }}
              className="flex-1 bg-white border border-gray-300 text-black hover:bg-gray-50 rounded-sm uppercase tracking-wide font-secondary text-xs"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              CALENDARIO
            </Button>
            <Button
              onClick={() => {
                setSelectedResource(room);
                setResourceType(room.type);
                setShowBookingModal(true);
              }}
              className="flex-1 bg-black text-white hover:bg-gray-800 rounded-sm uppercase tracking-wide font-secondary text-xs"
            >
              <Plus className="w-4 h-4 mr-2" />
              RESERVA
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => handleEditResource(room, 'room')}
              variant="outline"
              className="flex-1 bg-white border-blue-300 text-blue-700 hover:bg-blue-50 rounded-sm uppercase tracking-wide font-secondary text-xs"
            >
              <Edit className="w-4 h-4 mr-2" />
              EDITAR
            </Button>
            <Button
              onClick={() => handleDeleteResource(room, 'room')}
              variant="outline"
              className="flex-1 bg-white border-red-300 text-red-700 hover:bg-red-50 rounded-sm uppercase tracking-wide font-secondary text-xs"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              ELIMINAR
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Función que decide qué renderizar según el tipo
  const renderResourceCard = (resource) => {
    if (resource.type === 'booth') {
      return renderBoothCard(resource);
    } else {
      return renderRoomCard(resource);
    }
  };

  return (
    <div className="space-y-6" data-testid="resources-page">
      {/* Header */}
      <div>
        <h1 className="font-secondary text-4xl md:text-5xl font-black uppercase text-black tracking-tight">
          GESTIÓN DE RECURSOS
        </h1>
        <div className="h-1 w-32 tna-gradient mt-4"></div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeTab === 'all' ? 'ring-2 ring-black' : 'bg-white border-gray-200'
          } rounded-sm`}
          onClick={() => setActiveTab('all')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-secondary uppercase text-gray-600">Total Recursos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black font-primary">{rooms.length + booths.length}</div>
            <p className="text-xs text-gray-500 font-primary mt-1">
              {rooms.length} salas • {booths.length} casetas
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeTab === 'rooms' ? 'ring-2 ring-blue-500' : 'bg-white border-gray-200'
          } rounded-sm`}
          onClick={() => setActiveTab('rooms')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-secondary uppercase text-gray-600 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Salas de Reunión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 font-primary">{rooms.length}</div>
            <p className="text-xs text-gray-500 font-primary mt-1">Click para filtrar</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeTab === 'booths' ? 'ring-2 ring-purple-500' : 'bg-white border-gray-200'
          } rounded-sm`}
          onClick={() => setActiveTab('booths')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-secondary uppercase text-gray-600 flex items-center gap-2">
              <Phone className="w-4 h-4 text-purple-600" />
              Casetas Telefónicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 font-primary">{booths.length}</div>
            <p className="text-xs text-gray-500 font-primary mt-1">Click para filtrar</p>
          </CardContent>
        </Card>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredResources.map(resource => renderResourceCard(resource))}
      </div>

      {filteredResources.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" strokeWidth={1} />
          <p className="text-gray-500 font-primary">No hay recursos para mostrar</p>
        </div>
      )}

      {/* Calendar Modal */}
      <Dialog open={showCalendarModal} onOpenChange={setShowCalendarModal}>
        <DialogContent className="bg-white border-gray-200 text-black max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl">
              CALENDARIO - {selectedResource?.name}
            </DialogTitle>
            <p className="text-gray-600 font-primary text-sm">Visualización de disponibilidad y reservas</p>
          </DialogHeader>
          <div className="mt-4" style={{ height: '600px' }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              eventStyleGetter={eventStyleGetter}
              views={['month', 'week', 'day']}
              defaultView="week"
              min={new Date(2024, 0, 1, 8, 0, 0)}
              max={new Date(2024, 0, 1, 19, 0, 0)}
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
                noEventsInRange: "Sin reservas en este rango"
              }}
              onSelectSlot={(slotInfo) => {
                setBookingForm({
                  ...bookingForm,
                  start_time: moment(slotInfo.start).format('YYYY-MM-DDTHH:mm'),
                  end_time: moment(slotInfo.end).format('YYYY-MM-DDTHH:mm')
                });
                setShowCalendarModal(false);
                setShowBookingModal(true);
              }}
              selectable
            />
          </div>
          <div className="mt-4 flex gap-4 text-sm font-primary">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span>Confirmada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-600 rounded"></div>
              <span>Pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 rounded"></div>
              <span>Cancelada</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={(open) => {
        setShowBookingModal(open);
        if (!open) resetBookingForm();
      }}>
        <DialogContent className="bg-white border-gray-200 text-black max-w-md">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl">NUEVA RESERVA</DialogTitle>
            <p className="text-gray-600 font-primary text-sm">{selectedResource?.name}</p>
          </DialogHeader>
          <form onSubmit={handleBookingSubmit} className="space-y-4 mt-4">
            {/* Campo de Cliente con búsqueda */}
            <div className="space-y-2">
              <Label className="text-black font-primary font-medium">Cliente *</Label>
              
              {/* Indicador de modo seleccionado */}
              {selectedClient && (
                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-sm text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-700">Cliente: <strong>{selectedClient.name}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setClientSearchTerm('');
                      setBookingForm({ ...bookingForm, client_name: '', client_email: '', client_phone: '', client_id: null });
                    }}
                    className="ml-auto text-green-600 hover:text-green-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {clientSelectionMode === 'manual' && !selectedClient && bookingForm.client_name && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-sm text-sm">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-700">Nombre libre: <strong>{bookingForm.client_name}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setClientSelectionMode('search');
                      setClientSearchTerm('');
                      setBookingForm({ ...bookingForm, client_name: '', client_email: '', client_phone: '', client_id: null });
                    }}
                    className="ml-auto text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {/* Campo de búsqueda */}
              {!selectedClient && clientSelectionMode !== 'manual' && (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={clientSearchTerm}
                      onChange={(e) => {
                        setClientSearchTerm(e.target.value);
                        setShowClientDropdown(true);
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                      placeholder="Buscar cliente o escribir nombre..."
                      className="pl-10 bg-white border-gray-300 text-black"
                    />
                  </div>
                  
                  {/* Dropdown de resultados */}
                  {showClientDropdown && clientSearchTerm && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-sm shadow-lg max-h-60 overflow-y-auto">
                      {/* Clientes encontrados */}
                      {filteredClients.length > 0 && (
                        <div className="p-2 border-b border-gray-100">
                          <p className="text-xs text-gray-500 font-medium mb-1">Clientes existentes</p>
                          {filteredClients.map(client => (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => handleSelectClient(client)}
                              className="w-full text-left p-2 hover:bg-gray-50 rounded-sm"
                            >
                              <p className="font-medium text-sm">{client.name}</p>
                              <p className="text-xs text-gray-500">{client.email}</p>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {/* Opciones adicionales */}
                      <div className="p-2 space-y-1">
                        <button
                          type="button"
                          onClick={handleUseManualName}
                          className="w-full flex items-center gap-2 p-2 hover:bg-blue-50 rounded-sm text-left"
                        >
                          <Users className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-blue-700">Usar &quot;{clientSearchTerm}&quot; como nombre</p>
                            <p className="text-xs text-gray-500">Sin vincular a cliente</p>
                          </div>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setNewClientForm({ name: clientSearchTerm, email: '', phone: '', company: '' });
                            setShowNewClientModal(true);
                            setShowClientDropdown(false);
                          }}
                          className="w-full flex items-center gap-2 p-2 hover:bg-green-50 rounded-sm text-left"
                        >
                          <UserPlus className="w-4 h-4 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-green-700">Crear nuevo cliente</p>
                            <p className="text-xs text-gray-500">Agregar &quot;{clientSearchTerm}&quot; al sistema</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Email (solo si es nombre manual) */}
            {(clientSelectionMode === 'manual' || !selectedClient) && (
              <div>
                <Label className="text-black font-primary font-medium">Email {clientSelectionMode === 'manual' ? '' : '*'}</Label>
                <Input
                  type="email"
                  value={bookingForm.client_email}
                  onChange={(e) => setBookingForm({ ...bookingForm, client_email: e.target.value })}
                  className="bg-white border-gray-300 text-black"
                  required={clientSelectionMode !== 'manual'}
                  disabled={!!selectedClient}
                />
              </div>
            )}
            
            {/* Teléfono */}
            <div>
              <Label className="text-black font-primary font-medium">Teléfono</Label>
              <Input
                value={bookingForm.client_phone}
                onChange={(e) => setBookingForm({ ...bookingForm, client_phone: e.target.value })}
                className="bg-white border-gray-300 text-black"
                disabled={!!selectedClient}
              />
            </div>
            
            <div>
              <Label className="text-black font-primary font-medium">Inicio *</Label>
              <Input
                type="datetime-local"
                value={bookingForm.start_time}
                onChange={(e) => setBookingForm({ ...bookingForm, start_time: e.target.value })}
                className="bg-white border-gray-300 text-black"
                required
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Término *</Label>
              <Input
                type="datetime-local"
                value={bookingForm.end_time}
                onChange={(e) => setBookingForm({ ...bookingForm, end_time: e.target.value })}
                className="bg-white border-gray-300 text-black"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={!bookingForm.client_name || !bookingForm.start_time || !bookingForm.end_time}
              className="w-full bg-black text-white hover:bg-gray-800 rounded-sm font-bold uppercase tracking-wide font-secondary disabled:opacity-50"
            >
              CREAR RESERVA
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Crear Nuevo Cliente */}
      <Dialog open={showNewClientModal} onOpenChange={setShowNewClientModal}>
        <DialogContent className="bg-white border-gray-200 text-black max-w-md">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              NUEVO CLIENTE
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-black font-primary font-medium">Nombre *</Label>
              <Input
                value={newClientForm.name}
                onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                className="bg-white border-gray-300 text-black"
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Email *</Label>
              <Input
                type="email"
                value={newClientForm.email}
                onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                className="bg-white border-gray-300 text-black"
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Teléfono</Label>
              <Input
                value={newClientForm.phone}
                onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                className="bg-white border-gray-300 text-black"
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Empresa</Label>
              <Input
                value={newClientForm.company}
                onChange={(e) => setNewClientForm({ ...newClientForm, company: e.target.value })}
                className="bg-white border-gray-300 text-black"
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewClientModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleCreateNewClient}
                className="flex-1 bg-green-600 text-white hover:bg-green-700"
              >
                Crear Cliente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Resource Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-white border-gray-200 text-black max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl">
              EDITAR RECURSO
            </DialogTitle>
            <p className="text-gray-600 font-primary text-sm">
              {editingResource?.name} • {resourceType === 'room' ? 'Sala' : 'Caseta'}
            </p>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
            <div>
              <Label className="text-black font-primary font-medium">Nombre *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="bg-white border-gray-300 text-black"
                required
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">
                Capacidad {resourceType === 'room' ? '(personas) *' : '(opcional)'}
              </Label>
              <Input
                type="number"
                value={editForm.capacity}
                onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                className="bg-white border-gray-300 text-black"
                min="1"
                required={resourceType === 'room'}
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Descripción</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="bg-white border-gray-300 text-black min-h-20"
                placeholder="Describe el recurso..."
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Imagen del Recurso</Label>
              <div className="mt-2 flex items-start gap-4">
                {/* Preview de imagen */}
                <div className="w-32 h-32 bg-gray-100 rounded-sm flex-shrink-0 overflow-hidden border-2 border-dashed border-gray-300">
                  {editForm.image_url ? (
                    <img 
                      src={editForm.image_url} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-300" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                
                {/* Controles de carga */}
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="bg-white border-gray-300 text-black"
                  />
                  <p className="text-xs text-gray-500 font-primary">
                    Sube una imagen (máx. 5MB) o ingresa una URL abajo
                  </p>
                  
                  {/* Campo URL opcional */}
                  <div className="pt-2">
                    <Input
                      type="url"
                      value={editForm.image_url}
                      onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                      className="bg-white border-gray-300 text-black text-sm"
                      placeholder="O ingresa URL: https://ejemplo.com/imagen.jpg"
                    />
                  </div>
                  
                  {/* Botón para remover imagen */}
                  {editForm.image_url && (
                    <Button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, image_url: '' })}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover imagen
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingResource(null);
                }}
                variant="outline"
                className="flex-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 rounded-sm"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={uploadingImage}
                className="flex-1 bg-black text-white hover:bg-gray-800 rounded-sm font-bold uppercase tracking-wide font-secondary"
              >
                {uploadingImage ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-pulse" />
                    CARGANDO IMAGEN...
                  </>
                ) : (
                  'GUARDAR CAMBIOS'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
