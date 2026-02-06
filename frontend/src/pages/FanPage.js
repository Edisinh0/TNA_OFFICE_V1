import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { API } from '../utils/api';
import { isAuthenticated, getUser } from '../utils/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Calendar, Users, Package, Building2, Phone, MapPin, Mail, Clock, Search, Filter } from 'lucide-react';
import axios from 'axios';
import InteractiveCalendar from '../components/InteractiveCalendar';

const LOGO_URL = process.env.PUBLIC_URL + '/logo-tna.png';

export const FanPage = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [booths, setBooths] = useState([]);
  const [products, setProducts] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [bookingForm, setBookingForm] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    start_time: '',
    end_time: '',
    notes: ''
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [resourceBookings, setResourceBookings] = useState([]);
  const [productForm, setProductForm] = useState({
    product_id: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    details: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [roomsRes, boothsRes, productsRes] = await Promise.all([
        axios.get(`${API}/rooms/public`),
        axios.get(`${API}/booths/public`),
        axios.get(`${API}/products/public`)
      ]);
      setRooms(roomsRes.data);
      setBooths(boothsRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/requests`, {
        request_type: 'booking',
        client_name: bookingForm.client_name,
        client_email: bookingForm.client_email,
        client_phone: bookingForm.client_phone,
        details: {
          resource_type: selectedResource.type,
          resource_id: selectedResource.id,
          resource_name: selectedResource.name,
          start_time: bookingForm.start_time,
          end_time: bookingForm.end_time,
          notes: bookingForm.notes
        }
      });
      toast.success('Solicitud enviada. Te contactaremos pronto.');
      setShowBookingModal(false);
      setBookingForm({
        client_name: '',
        client_email: '',
        client_phone: '',
        start_time: '',
        end_time: '',
        notes: ''
      });
    } catch (error) {
      toast.error('Error al enviar solicitud');
    }
  };

  const handleProductRequest = async (e) => {
    e.preventDefault();
    try {
      const product = products.find(p => p.id === productForm.product_id);
      await axios.post(`${API}/requests`, {
        request_type: 'product',
        client_name: productForm.client_name,
        client_email: productForm.client_email,
        client_phone: productForm.client_phone,
        details: {
          product_id: productForm.product_id,
          product_name: product?.name,
          notes: productForm.details
        }
      });
      toast.success('Solicitud enviada. Te contactaremos pronto.');
      setShowProductModal(false);
      setProductForm({
        product_id: '',
        client_name: '',
        client_email: '',
        client_phone: '',
        details: ''
      });
    } catch (error) {
      toast.error('Error al enviar solicitud');
    }
  };

  // Función para abrir el modal de reserva y cargar las reservas existentes
  const openBookingModal = async (resource, type) => {
    setSelectedResource({ ...resource, type });
    setSelectedDate(new Date());
    setShowBookingModal(true);
    
    try {
      const response = await axios.get(`${API}/bookings/public/${type}/${resource.id}`);
      setResourceBookings(response.data);
    } catch (error) {
      console.error('Error loading bookings:', error);
      setResourceBookings([]);
    }
  };

  // Obtener categorías únicas
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(products.map(p => p.category))].sort();
    return uniqueCategories;
  }, [products]);

  // Filtrar productos según búsqueda y categoría
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  return (
    <div className="min-h-screen bg-[#000000]" data-testid="fan-page">
      {/* Hero Section */}
      <section 
        className="relative h-screen flex items-center justify-center"
        style={{
          backgroundImage: `url('${process.env.PUBLIC_URL}/hero-background.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black"></div>
        <div className="relative z-10 text-center px-4 max-w-5xl">
          <img 
            src={LOGO_URL} 
            alt="TNA Office" 
            className="h-48 md:h-64 w-auto object-contain mx-auto mb-6 brightness-0 invert"
          />
          <div className="h-2 w-48 tna-gradient mx-auto mb-8"></div>
          <p className="text-xl md:text-2xl text-zinc-300 font-primary mb-12 max-w-3xl mx-auto">
            Business Center Premium en el corazón de Las Condes. Salas de reunión, casetas telefónicas y servicios empresariales de primer nivel.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            {isAuthenticated() ? (
              <Button
                data-testid="dashboard-nav-button"
                onClick={() => {
                  const user = getUser();
                  if (user?.role === 'admin' || user?.role === 'comisionista') {
                    navigate('/dashboard');
                  } else {
                    navigate('/dashboard');
                  }
                }}
                className="bg-white text-black hover:bg-zinc-200 rounded-sm font-bold uppercase tracking-wide px-8 py-6 font-secondary text-lg"
              >
                IR AL PANEL
              </Button>
            ) : (
              <Button
                data-testid="login-nav-button"
                onClick={() => navigate('/login')}
                className="bg-white text-black hover:bg-zinc-200 rounded-sm font-bold uppercase tracking-wide px-8 py-6 font-secondary text-lg"
              >
                ACCEDER AL SISTEMA
              </Button>
            )}
            <Button
              onClick={() => document.getElementById('servicios').scrollIntoView({ behavior: 'smooth' })}
              variant="outline"
              className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-black rounded-sm uppercase tracking-wide px-8 py-6 font-secondary text-lg"
            >
              EXPLORAR SERVICIOS
            </Button>
          </div>
        </div>
      </section>

      {/* Location Info */}
      <section className="py-16 px-4 bg-[#0A0A0A] border-y border-zinc-900">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#121212] border border-zinc-800 rounded-sm flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6 text-[#FF3D3D]" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-white font-bold font-secondary uppercase text-sm mb-2">UBICACIÓN</h3>
              <p className="text-zinc-400 font-primary text-sm">Badajoz 45, Piso 17<br />Las Condes, Santiago</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#121212] border border-zinc-800 rounded-sm flex items-center justify-center flex-shrink-0">
              <Phone className="w-6 h-6 text-[#0097FF]" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-white font-bold font-secondary uppercase text-sm mb-2">CONTACTO</h3>
              <p className="text-zinc-400 font-primary text-sm">contacto@tnaoffice.cl</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#121212] border border-zinc-800 rounded-sm flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-[#FF8A00]" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-white font-bold font-secondary uppercase text-sm mb-2">HORARIO</h3>
              <p className="text-zinc-400 font-primary text-sm">Lunes a Viernes<br />9:00 - 19:00 hrs</p>
            </div>
          </div>
        </div>
      </section>

      {/* Rooms Section */}
      <section id="servicios" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h2 className="font-secondary text-4xl md:text-5xl font-black uppercase text-white tracking-tight mb-4">
              SALAS DE REUNIONES
            </h2>
            <div className="h-1 w-32 tna-gradient"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rooms.map((room) => (
              <Card key={room.id} className="bg-[#0A0A0A] border-zinc-800 rounded-sm hover:border-zinc-700 transition-all duration-300 overflow-hidden">
                <div className="h-48 bg-zinc-900 overflow-hidden">
                  {room.image_url ? (
                    <img src={room.image_url} alt={room.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                      <Building2 className="w-16 h-16 text-zinc-700" strokeWidth={1} />
                    </div>
                  )}
                </div>
                <CardHeader className="border-b border-zinc-900">
                  <CardTitle className="font-secondary uppercase text-white flex items-center justify-between">
                    {room.name}
                    <span className="text-sm text-zinc-400 font-primary normal-case flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {room.capacity} personas
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-zinc-400 font-primary text-sm mb-4">{room.description}</p>
                  <Button
                    data-testid={`book-room-${room.name}`}
                    onClick={() => openBookingModal(room, 'room')}
                    className="w-full bg-transparent border border-zinc-700 text-white hover:bg-zinc-900 rounded-sm uppercase tracking-wide font-secondary"
                  >
                    SOLICITAR RESERVA
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Booths Section - Diseño Minimalista */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#0A0A0A] to-black">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h2 className="font-secondary text-4xl md:text-5xl font-black uppercase text-white tracking-tight mb-4">
              CASETAS TELEFÓNICAS
            </h2>
            <div className="h-1 w-32 tna-gradient"></div>
            <p className="text-zinc-400 font-primary mt-4">
              Espacios privados e insonorizados para llamadas telefónicas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {booths.map((booth) => (
              <Card key={booth.id} className="bg-gradient-to-br from-purple-900/20 to-black border-purple-500/30 rounded-2xl hover:border-purple-500/60 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 overflow-hidden group">
                <CardContent className="p-8">
                  {/* Header con icono moderno */}
                  <div className="flex items-start gap-6 mb-6">
                    {/* Icono de caseta telefónica */}
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1">
                      <h3 className="text-3xl font-black text-white font-secondary uppercase mb-2 group-hover:text-purple-400 transition-colors">
                        {booth.name}
                      </h3>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-full font-primary font-bold uppercase tracking-wider shadow-lg">
                          Caseta Privada
                        </span>
                        {booth.capacity && (
                          <span className="text-sm text-purple-300 font-primary flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {booth.capacity} persona{booth.capacity !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Imagen opcional */}
                    {booth.image_url && (
                      <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-purple-500/50 shadow-lg group-hover:scale-105 transition-transform duration-500">
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

                  {/* Descripción */}
                  <p className="text-zinc-300 font-primary text-sm leading-relaxed mb-6 pl-1">
                    {booth.description || 'Espacio privado perfecto para llamadas importantes'}
                  </p>

                  {/* Características destacadas */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-purple-950/30 border border-purple-800/30 rounded-lg p-3">
                      <div className="text-purple-400 text-xs font-primary uppercase tracking-wider mb-1">Privacidad</div>
                      <div className="text-white font-secondary text-sm font-bold">100% Insonorizada</div>
                    </div>
                    <div className="bg-purple-950/30 border border-purple-800/30 rounded-lg p-3">
                      <div className="text-purple-400 text-xs font-primary uppercase tracking-wider mb-1">Disponibilidad</div>
                      <div className="text-white font-secondary text-sm font-bold">Por Hora</div>
                    </div>
                  </div>

                  {/* Botón de acción destacado */}
                  <Button
                    data-testid={`book-booth-${booth.name}`}
                    onClick={() => openBookingModal(booth, 'booth')}
                    className="w-full bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 hover:from-purple-700 hover:via-purple-800 hover:to-purple-900 text-white rounded-xl font-bold uppercase tracking-wide font-secondary py-6 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 transition-all duration-300 group-hover:scale-105"
                  >
                    <Phone className="w-5 h-5 mr-2 animate-pulse" />
                    SOLICITAR RESERVA
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h2 className="font-secondary text-4xl md:text-5xl font-black uppercase text-white tracking-tight mb-4">
              PRODUCTOS Y SERVICIOS
            </h2>
            <div className="h-1 w-32 tna-gradient mb-8"></div>
            
            {/* Filtros y Búsqueda */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              {/* Buscador */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="Buscar productos o servicios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#0A0A0A] border-zinc-800 text-white placeholder:text-zinc-500 focus:border-[#FF8A00] rounded-sm font-primary"
                />
              </div>
              
              {/* Filtro por categoría */}
              <div className="md:w-64">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="bg-[#0A0A0A] border-zinc-800 text-white rounded-sm font-primary">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0A] border-zinc-800 text-white">
                    <SelectItem value="all" className="font-primary">Todas las categorías</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category} className="font-primary">
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Resultados contador */}
            <div className="mb-6 text-zinc-400 font-primary text-sm">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'producto encontrado' : 'productos encontrados'}
              {(searchTerm || selectedCategory !== 'all') && (
                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                  }}
                  variant="ghost"
                  className="ml-4 text-[#FF8A00] hover:text-[#FF8A00] hover:bg-zinc-900 text-sm"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Productos Destacados */}
          {filteredProducts.filter(p => p.featured).length > 0 && (
            <div className="mb-8">
              <div className="grid grid-cols-1 gap-3">
                {filteredProducts.filter(p => p.featured).map((product) => (
                  <Card key={product.id} className="bg-transparent border-0 rounded-lg overflow-hidden transition-all duration-300">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-4">
                        {/* Estrella y Texto Destacado */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-lg flex-shrink-0">⭐</span>
                          {product.featured_text && (
                            <span className="text-xs px-2 py-1 bg-gradient-to-r from-[#FF8A00] to-orange-600 text-white rounded-full font-secondary uppercase flex-shrink-0">
                              {product.featured_text}
                            </span>
                          )}
                        </div>
                        
                        {/* Botón */}
                        <div className="flex-shrink-0">
                          <Button
                            data-testid={`request-product-${product.name}`}
                            onClick={() => {
                              setProductForm({ ...productForm, product_id: product.id });
                              setShowProductModal(true);
                            }}
                            size="sm"
                            className="bg-[#FF8A00] hover:bg-orange-600 text-white font-secondary text-xs uppercase tracking-wide transition-colors"
                          >
                            Solicitar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent my-8"></div>
            </div>
          )}

          {/* Lista de productos - Diseño Minimalista */}
          {filteredProducts.length > 0 ? (
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="group flex items-center gap-4 p-3 hover:bg-zinc-900/50 rounded-lg transition-all duration-200 cursor-pointer"
                  onClick={() => {
                    setProductForm({ ...productForm, product_id: product.id });
                    setShowProductModal(true);
                  }}
                >
                  {/* Imagen pequeña */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></div>';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-zinc-600" />
                      </div>
                    )}
                  </div>

                  {/* Info del producto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-white font-primary text-sm font-medium truncate">
                        {product.name}
                      </h3>
                      <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded font-primary flex-shrink-0">
                        {product.category}
                      </span>
                    </div>
                    <p className="text-zinc-500 font-primary text-xs truncate">
                      {product.description}
                    </p>
                  </div>

                  {/* Precio */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-white font-primary font-semibold text-sm">
                      {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(product.sale_price)}
                    </div>
                  </div>

                  {/* Flecha indicadora */}
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4 text-[#FF8A00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 font-primary text-lg mb-2">No se encontraron productos</p>
              <p className="text-zinc-600 font-primary text-sm">Intenta con otros términos de búsqueda o categoría</p>
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
                className="mt-6 bg-transparent border border-zinc-700 text-white hover:bg-zinc-900 rounded-sm uppercase tracking-wide font-secondary"
              >
                Ver todos los productos
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-[#0A0A0A] border-t border-zinc-900">
        <div className="max-w-6xl mx-auto text-center">
          <img 
            src={LOGO_URL} 
            alt="TNA Office" 
            className="h-12 w-auto object-contain mx-auto mb-4 brightness-0 invert"
          />
          <div className="h-1 w-24 tna-gradient mx-auto mb-4"></div>
          <p className="text-zinc-500 font-primary text-sm">© {new Date().getFullYear()} TNA Office. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* Booking Modal con Calendario Interactivo */}
      <Dialog open={showBookingModal} onOpenChange={(open) => {
        setShowBookingModal(open);
        if (!open) {
          setResourceBookings([]);
          setSelectedDate(new Date());
        }
      }}>
        <DialogContent className="bg-[#0A0A0A] border-zinc-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl">SOLICITAR RESERVA</DialogTitle>
            <p className="text-zinc-400 font-primary text-sm">{selectedResource?.name}</p>
          </DialogHeader>
          
          <form onSubmit={handleBookingSubmit} className="space-y-4 mt-4">
            {/* Datos del cliente */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-white font-primary">Nombre completo</Label>
                <Input
                  data-testid="booking-name-input"
                  value={bookingForm.client_name}
                  onChange={(e) => setBookingForm({ ...bookingForm, client_name: e.target.value })}
                  className="bg-[#121212] border-zinc-800 text-white"
                  required
                />
              </div>
              <div>
                <Label className="text-white font-primary">Email</Label>
                <Input
                  data-testid="booking-email-input"
                  type="email"
                  value={bookingForm.client_email}
                  onChange={(e) => setBookingForm({ ...bookingForm, client_email: e.target.value })}
                  className="bg-[#121212] border-zinc-800 text-white"
                  required
                />
              </div>
              <div>
                <Label className="text-white font-primary">Teléfono</Label>
                <Input
                  value={bookingForm.client_phone}
                  onChange={(e) => setBookingForm({ ...bookingForm, client_phone: e.target.value })}
                  className="bg-[#121212] border-zinc-800 text-white"
                />
              </div>
            </div>

            {/* Calendario Interactivo */}
            <div className="mt-4">
              <Label className="text-white font-primary mb-2 block">Selecciona fecha y horario arrastrando sobre el calendario</Label>
              <InteractiveCalendar
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                bookings={resourceBookings}
                onTimeSelect={(selection) => {
                  // Construir datetime completo
                  const startDateTime = `${selection.date}T${selection.startTime}`;
                  const endDateTime = `${selection.date}T${selection.endTime}`;
                  setBookingForm({
                    ...bookingForm,
                    start_time: startDateTime,
                    end_time: endDateTime
                  });
                }}
              />
            </div>

            {/* Mostrar selección actual */}
            {bookingForm.start_time && bookingForm.end_time && (
              <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg">
                <p className="text-green-400 font-primary text-sm">
                  <strong>Horario seleccionado:</strong> {new Date(bookingForm.start_time).toLocaleString('es-CL')} - {new Date(bookingForm.end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}

            {/* Notas adicionales */}
            <div>
              <Label className="text-white font-primary">Notas adicionales</Label>
              <Textarea
                value={bookingForm.notes}
                onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                className="bg-[#121212] border-zinc-800 text-white"
                rows={2}
              />
            </div>

            <Button
              data-testid="booking-submit-button"
              type="submit"
              disabled={!bookingForm.start_time || !bookingForm.end_time}
              className="w-full bg-white text-black hover:bg-zinc-200 rounded-sm font-bold uppercase tracking-wide font-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ENVIAR SOLICITUD
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Request Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="bg-[#0A0A0A] border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl">SOLICITAR PRODUCTO/SERVICIO</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProductRequest} className="space-y-4 mt-4">
            <div>
              <Label className="text-white font-primary">Nombre completo</Label>
              <Input
                data-testid="product-name-input"
                value={productForm.client_name}
                onChange={(e) => setProductForm({ ...productForm, client_name: e.target.value })}
                className="bg-[#121212] border-zinc-800 text-white"
                required
              />
            </div>
            <div>
              <Label className="text-white font-primary">Email</Label>
              <Input
                data-testid="product-email-input"
                type="email"
                value={productForm.client_email}
                onChange={(e) => setProductForm({ ...productForm, client_email: e.target.value })}
                className="bg-[#121212] border-zinc-800 text-white"
                required
              />
            </div>
            <div>
              <Label className="text-white font-primary">Teléfono</Label>
              <Input
                value={productForm.client_phone}
                onChange={(e) => setProductForm({ ...productForm, client_phone: e.target.value })}
                className="bg-[#121212] border-zinc-800 text-white"
              />
            </div>
            <div>
              <Label className="text-white font-primary">Detalles de su solicitud</Label>
              <Textarea
                data-testid="product-details-input"
                value={productForm.details}
                onChange={(e) => setProductForm({ ...productForm, details: e.target.value })}
                className="bg-[#121212] border-zinc-800 text-white"
                rows={4}
                placeholder="Cuéntenos más sobre lo que necesita..."
              />
            </div>
            <Button
              data-testid="product-submit-button"
              type="submit"
              className="w-full bg-white text-black hover:bg-zinc-200 rounded-sm font-bold uppercase tracking-wide font-secondary"
            >
              ENVIAR SOLICITUD
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};