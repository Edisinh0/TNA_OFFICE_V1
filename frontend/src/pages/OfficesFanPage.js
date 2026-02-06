import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Building2, MapPin, Users, DollarSign, CheckCircle, Mail, Phone as PhoneIcon, User, Maximize2, CheckSquare, Square, X, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../utils/api';

const LOGO_URL = process.env.PUBLIC_URL + '/logo-tna.png';
const FLOOR_PLAN_IMAGE = process.env.PUBLIC_URL + '/floor-plan.png';

export const OfficesFanPage = () => {
  const [offices, setOffices] = useState([]);
  const [hoveredOffice, setHoveredOffice] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [selectedOffices, setSelectedOffices] = useState([]); // Para selección múltiple
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  const [customCoordinates, setCustomCoordinates] = useState({});
  const [officeOrder, setOfficeOrder] = useState([]);
  const [sortBy, setSortBy] = useState('custom'); // 'custom', 'number', 'location', 'size'
  
  // Estado para gestionar taps en móviles
  const [lastTappedOffice, setLastTappedOffice] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si es dispositivo móvil o tablet
  useEffect(() => {
    const checkIfMobile = () => {
      const isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
      const isSmallScreen = window.innerWidth <= 1024; // tablets incluidas
      setIsMobile(isTouchDevice && isSmallScreen);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const loadOffices = async () => {
    try {
      const response = await axios.get(`${API}/offices/public/all`);
      setOffices(response.data);
    } catch (error) {
      console.error('Error loading offices:', error);
      toast.error('Error al cargar oficinas');
    }
  };

  useEffect(() => {
    loadOffices();
    
    // Load admin coordinates from database (no auth required for viewing)
    const loadAdminCoordinates = async () => {
      try {
        const response = await axios.get(`${API}/floor-plan/coordinates`);
        if (response.data && response.data.coordinates && Object.keys(response.data.coordinates).length > 0) {
          setCustomCoordinates(response.data.coordinates);
        }
      } catch (error) {
        console.log('Could not load admin coordinates, using defaults');
      }
    };
    
    loadAdminCoordinates();

    // Load custom office order from localStorage
    const savedOrder = localStorage.getItem('fanPageOfficeOrder');
    if (savedOrder) {
      try {
        setOfficeOrder(JSON.parse(savedOrder));
      } catch (e) {
        console.error('Error loading saved order:', e);
      }
    }

    // Load saved sort preference
    const savedSort = localStorage.getItem('fanPageSortBy');
    if (savedSort) {
      setSortBy(savedSort);
    }
  }, []);

  // Coordenadas exactas del área de administración (sincronizadas)
  // Estas coordenadas han sido ajustadas manualmente para coincidir con el plano
  const defaultOfficeCoordinates = {
    // Lado izquierdo - Fila superior
    '1715': { x: 80, y: 355, width: 190, height: 170 },
    '1716': { x: 280, y: 355, width: 150, height: 170 },
    '1717': { x: 440, y: 355, width: 155, height: 170 },
    '1718': { x: 605, y: 355, width: 155, height: 170 },
    '1719': { x: 770, y: 355, width: 155, height: 170 },
    
    // Lado izquierdo - Fila media
    '1712': { x: 85, y: 560, width: 180, height: 195 },
    '1713': { x: 275, y: 560, width: 205, height: 195 },
    '1714': { x: 490, y: 560, width: 220, height: 195 },
    '1722': { x: 720, y: 560, width: 165, height: 195 },
    '1724': { x: 895, y: 560, width: 165, height: 195 },
    '1720': { x: 1070, y: 560, width: 165, height: 195 },
    '1732': { x: 1245, y: 560, width: 180, height: 195 },
    
    // Lado izquierdo - Fila inferior
    '1711': { x: 105, y: 775, width: 155, height: 155 },
    '1710': { x: 270, y: 775, width: 300, height: 155 },
    '1709': { x: 580, y: 775, width: 285, height: 155 },
    '1705': { x: 875, y: 775, width: 140, height: 155 },
    '1707': { x: 1025, y: 775, width: 140, height: 155 },
    '1703': { x: 1175, y: 775, width: 140, height: 155 },
    '1702': { x: 1325, y: 775, width: 135, height: 155 },
    '1701': { x: 1470, y: 775, width: 130, height: 155 },
    
    // Centro - Fila media
    '1737': { x: 935, y: 355, width: 155, height: 170 },
    '1721': { x: 1100, y: 355, width: 155, height: 170 },
    '1723': { x: 1265, y: 355, width: 155, height: 170 },
    '1725': { x: 1430, y: 355, width: 155, height: 170 },
    '1726': { x: 1595, y: 355, width: 155, height: 170 },
    '1727': { x: 1760, y: 355, width: 155, height: 170 },
    
    // Centro superior
    '1728': { x: 800, y: 180, width: 185, height: 145 },
    '1729': { x: 995, y: 180, width: 185, height: 145 },
    '1731': { x: 1190, y: 180, width: 180, height: 145 },
    '1730': { x: 1380, y: 180, width: 180, height: 145 },
    '1736': { x: 1570, y: 180, width: 175, height: 145 },
    '1735': { x: 1755, y: 180, width: 175, height: 145 },
    '1734': { x: 1940, y: 180, width: 175, height: 145 },
    '1733': { x: 2125, y: 180, width: 175, height: 145 },
    
    // Lado derecho
    '1738': { x: 475, y: 610, width: 125, height: 145 },
    '1708': { x: 1630, y: 610, width: 140, height: 145 },
    '1706': { x: 1780, y: 610, width: 140, height: 145 },
    '1704': { x: 1930, y: 610, width: 140, height: 145 },
    
    // Oficina 1780 (si existe en DB)
    '1780': { x: 610, y: 610, width: 105, height: 145 },
  };

  // Merge default with custom coordinates (edit mode)
  const officeCoordinates = { ...defaultOfficeCoordinates, ...customCoordinates };

  // ============ EDIT MODE FUNCTIONS (TEMPORARY) ============
  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    localStorage.setItem('fanPageSortBy', newSort);
    
    if (newSort === 'number') {
      const sorted = [...offices].sort((a, b) => a.office_number.localeCompare(b.office_number));
      setOfficeOrder(sorted.map(o => o.office_number));
    } else if (newSort === 'location') {
      const sorted = [...offices].sort((a, b) => a.location.localeCompare(b.location));
      setOfficeOrder(sorted.map(o => o.office_number));
    } else if (newSort === 'size') {
      const sorted = [...offices].sort((a, b) => b.square_meters - a.square_meters);
      setOfficeOrder(sorted.map(o => o.office_number));
    }
    
    toast.success(`Ordenamiento cambiado a: ${newSort === 'number' ? 'Número' : newSort === 'location' ? 'Ubicación' : newSort === 'size' ? 'Tamaño' : 'Personalizado'}`);
  };

  const handleOfficeHover = (officeNum, event) => {
    const office = offices.find(o => o.office_number === officeNum);
    if (office) {
      setHoveredOffice(office);
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
    }
  };

  const handleOfficeClick = (office, event) => {
    // En móviles: primer tap muestra info, segundo tap abre modal
    if (isMobile) {
      // Si es el primer tap o tap en otra oficina diferente
      if (!hoveredOffice || hoveredOffice.office_number !== office.office_number) {
        // Mostrar tooltip
        // Calcular posición del tooltip basado en el viewport
        const svgElement = event.currentTarget.closest('svg');
        const svgRect = svgElement.getBoundingClientRect();
        const rectElement = event.currentTarget;
        const rectX = parseFloat(rectElement.getAttribute('x'));
        const rectY = parseFloat(rectElement.getAttribute('y'));
        const rectWidth = parseFloat(rectElement.getAttribute('width'));
        
        // Convertir coordenadas SVG a coordenadas de viewport
        const viewBox = svgElement.getAttribute('viewBox').split(' ');
        const viewBoxWidth = parseFloat(viewBox[2]);
        const scaleX = svgRect.width / viewBoxWidth;
        
        const screenX = svgRect.left + (rectX + rectWidth / 2) * scaleX;
        const screenY = svgRect.top + rectY * scaleX;
        
        setHoveredOffice(office);
        setTooltipPosition({
          x: screenX,
          y: screenY
        });
        setLastTappedOffice(office.office_number);
      } else {
        // Segundo tap en la misma oficina: abrir modal (disponible u ocupada)
        setSelectedOffice(office);
        const statusText = office.status === 'available' ? '' : ' (actualmente ocupada, consultar disponibilidad futura)';
        setContactForm({
          ...contactForm,
          message: `Estoy interesado en la oficina ${office.office_number}${statusText} (${office.square_meters}m², capacidad ${office.capacity || Math.floor(office.square_meters / 3)} personas)`
        });
        setShowContactModal(true);
        setHoveredOffice(null); // Cerrar tooltip
      }
    } else {
      // En desktop: comportamiento original (click directo)
      setSelectedOffice(office);
      const statusText = office.status === 'available' ? '' : ' (actualmente ocupada, consultar disponibilidad futura)';
      setContactForm({
        ...contactForm,
        message: `Estoy interesado en la oficina ${office.office_number}${statusText} (${office.square_meters}m², capacidad ${office.capacity || Math.floor(office.square_meters / 3)} personas)`
      });
      setShowContactModal(true);
    }
  };

  const handleSubmitContact = async (e) => {
    e.preventDefault();
    try {
      // Verificar si hay múltiples oficinas seleccionadas o una sola
      const officesToSend = selectedOffices.length > 0 ? selectedOffices : (selectedOffice ? [selectedOffice] : []);
      
      // Crear pre-cotización en lugar de solicitud
      await axios.post(`${API}/quotes/public`, {
        client_name: contactForm.name,
        client_email: contactForm.email,
        client_phone: contactForm.phone || '',
        message: contactForm.message,
        offices: officesToSend.map(o => ({
          id: o.id,
          office_number: o.office_number,
          location: o.location || '',
          square_meters: o.square_meters,
          capacity: o.capacity || Math.floor(o.square_meters / 3),
          sale_value_uf: o.sale_value_uf,
          cost_uf: o.cost_uf || 0
        }))
      });
      toast.success('¡Pre-cotización enviada! Nos contactaremos contigo pronto.');
      setShowContactModal(false);
      setContactForm({ name: '', email: '', phone: '', message: '' });
      setSelectedOffices([]);
    } catch (error) {
      console.error('Error details:', error.response?.data);
      toast.error('Error al enviar pre-cotización');
    }
  };

  // Función para agregar/quitar oficinas de la selección
  const toggleOfficeSelection = (office, e) => {
    e.stopPropagation(); // Evitar que se abra el modal
    setSelectedOffices(prev => {
      const isSelected = prev.find(o => o.id === office.id);
      if (isSelected) {
        return prev.filter(o => o.id !== office.id);
      } else {
        return [...prev, office];
      }
    });
  };

  // Verificar si una oficina está seleccionada
  const isOfficeSelected = (officeId) => {
    return selectedOffices.find(o => o.id === officeId) !== undefined;
  };

  // Calcular totales de oficinas seleccionadas
  const selectedTotals = {
    count: selectedOffices.length,
    squareMeters: selectedOffices.reduce((sum, o) => sum + o.square_meters, 0),
    capacity: selectedOffices.reduce((sum, o) => sum + (o.capacity || Math.floor(o.square_meters / 3)), 0),
    totalValue: selectedOffices.reduce((sum, o) => sum + o.sale_value_uf, 0)
  };

  // Abrir modal para cotización de selección múltiple
  const handleRequestMultipleQuote = () => {
    if (selectedOffices.length === 0) {
      toast.error('Por favor selecciona al menos una oficina');
      return;
    }
    
    const officeNumbers = selectedOffices.map(o => o.office_number).join(', ');
    setContactForm({
      ...contactForm,
      message: `Estoy interesado en cotizar ${selectedOffices.length} oficina(s): ${officeNumbers}. Total: ${selectedTotals.squareMeters}m², capacidad ${selectedTotals.capacity} personas, valor ${formatUF(selectedTotals.totalValue)}`
    });
    setSelectedOffice(null);
    setShowContactModal(true);
  };

  const formatUF = (amount) => {
    return `${parseFloat(amount).toFixed(2)} UF`;
  };

  const getOfficeColor = (office) => {
    if (!office) return 'rgba(229, 231, 235, 0.3)';
    
    // Si la oficina está seleccionada, mostrar en naranja
    if (isOfficeSelected(office.id)) {
      return 'rgba(249, 115, 22, 0.85)'; // Naranja brillante para seleccionadas
    }
    
    return office.status === 'available' 
      ? 'rgba(34, 197, 94, 0.7)'  // Verde para disponibles
      : 'rgba(59, 130, 246, 0.6)'; // Azul para ocupadas
  };

  const availableOffices = offices.filter(o => o.status === 'available');
  const occupiedOffices = offices.filter(o => o.status === 'occupied');

  // Sort offices based on selected method
  const getSortedOffices = (officeList) => {
    if (sortBy === 'custom' && officeOrder.length > 0) {
      // Use custom order
      return [...officeList].sort((a, b) => {
        const indexA = officeOrder.indexOf(a.office_number);
        const indexB = officeOrder.indexOf(b.office_number);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    } else if (sortBy === 'number') {
      return [...officeList].sort((a, b) => a.office_number.localeCompare(b.office_number));
    } else if (sortBy === 'location') {
      return [...officeList].sort((a, b) => a.location.localeCompare(b.location));
    } else if (sortBy === 'size') {
      return [...officeList].sort((a, b) => b.square_meters - a.square_meters);
    }
    return officeList;
  };

  const sortedAvailableOffices = getSortedOffices(availableOffices);
  const sortedAllOffices = getSortedOffices(offices);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt="TNA Office" className="h-10 md:h-12" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 font-secondary uppercase tracking-tight">
                  TNA OFFICE
                </h1>
                <p className="text-xs text-gray-500 font-primary">Business Center - Piso 17</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm text-gray-600 font-primary">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-500" />
                <span>Av. Apoquindo, Santiago</span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneIcon className="w-4 h-4 text-orange-500" />
                <span>+56 2 2XXX XXXX</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 font-secondary uppercase tracking-tight mb-3">
            OFICINAS DISPONIBLES
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-orange-500 to-orange-600 mx-auto mb-6 rounded-full"></div>
          <p className="text-lg md:text-xl text-gray-600 font-primary max-w-3xl mx-auto leading-relaxed">
            Descubre nuestras modernas oficinas en el corazón de Santiago. 
            Espacios flexibles diseñados para impulsar tu negocio.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div className="text-5xl font-black text-green-700 font-primary mb-2">
                {availableOffices.length}
              </div>
              <div className="text-sm text-green-700 font-secondary uppercase tracking-wider font-bold">
                Oficinas Disponibles
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Maximize2 className="w-8 h-8 text-white" />
              </div>
              <div className="text-5xl font-black text-orange-700 font-primary mb-2">
                {availableOffices.reduce((sum, o) => sum + o.square_meters, 0).toFixed(0)}m²
              </div>
              <div className="text-sm text-orange-700 font-secondary uppercase tracking-wider font-bold">
                Espacio Disponible Total
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div className="text-5xl font-black text-blue-700 font-primary mb-2">
                {availableOffices.reduce((sum, o) => sum + (o.capacity || Math.floor(o.square_meters / 3)), 0)}
              </div>
              <div className="text-sm text-blue-700 font-secondary uppercase tracking-wider font-bold">
                Capacidad Total
              </div>
            </div>
          </Card>
        </div>

        {/* Interactive Floor Plan */}
        <Card className="bg-white border-0 shadow-2xl overflow-hidden mb-12 rounded-2xl">
          <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-secondary uppercase text-gray-900 text-xl font-black tracking-tight">Plano Interactivo - Piso 17</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-6 text-sm font-primary">
                  <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-semibold text-green-700">Disponible ({availableOffices.length})</span>
                  </div>
                  <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-semibold text-blue-700">Ocupada ({occupiedOffices.length})</span>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 font-primary bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
              💡 <span className="font-semibold">Tip:</span> {isMobile 
                ? 'Toca cualquier oficina para ver sus detalles. Toca de nuevo para solicitar información o consultar disponibilidad' 
                : 'Haz click en cualquier oficina para solicitar información. Las verdes están disponibles y las azules actualmente ocupadas (puedes consultar disponibilidad futura)'}
            </p>
          </div>

          <div className="relative">
            <div className="relative w-full" style={{ paddingBottom: '40%' }}>
              <img 
                src={FLOOR_PLAN_IMAGE}
                alt="Plano Piso 17"
                className="absolute inset-0 w-full h-full object-contain"
                style={{ objectPosition: 'center' }}
              />
              
              <svg 
                viewBox="0 0 2500 1000" 
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: 'none' }}
                preserveAspectRatio="xMidYMid meet"
              >
                {Object.entries(officeCoordinates).map(([officeNum, coords]) => {
                  const office = offices.find(o => o.office_number === officeNum);
                  const color = getOfficeColor(office);
                  const isHovered = hoveredOffice?.office_number === officeNum;
                  const isAvailable = office?.status === 'available';
                  const isOccupied = office?.status === 'occupied';
                  
                  return (
                    <g key={officeNum}>
                      <rect
                        x={coords.x}
                        y={coords.y}
                        width={coords.width}
                        height={coords.height}
                        fill={color}
                        stroke={isHovered ? '#000' : isAvailable ? 'rgba(34, 197, 94, 0.8)' : isOccupied ? 'rgba(59, 130, 246, 0.8)' : 'rgba(107, 114, 128, 0.4)'}
                        strokeWidth={isHovered ? '5' : '2'}
                        className={office ? "cursor-pointer" : ""}
                        style={{ 
                          pointerEvents: 'all',
                          filter: isHovered ? 'brightness(1.2) drop-shadow(0 4px 8px rgba(0,0,0,0.4))' : 'none',
                          transition: 'all 0.15s',
                          touchAction: 'none'
                        }}
                        onMouseEnter={office && !isMobile ? (e) => handleOfficeHover(officeNum, e) : undefined}
                        onMouseLeave={!isMobile ? () => setHoveredOffice(null) : undefined}
                        onClick={(e) => {
                          if (office) {
                            e.preventDefault();
                            handleOfficeClick(office, e);
                          }
                        }}
                        onTouchStart={(e) => {
                          if (office && isMobile) {
                            e.preventDefault();
                            handleOfficeClick(office, e);
                          }
                        }}
                      />
                      
                      {/* Office number - always visible for all offices */}
                      {office && (
                        <text
                          x={coords.x + coords.width/2}
                          y={coords.y + coords.height/2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#1f2937"
                          fontSize={isHovered ? "28" : "24"}
                          fontWeight="900"
                          fontFamily="system-ui, -apple-system, sans-serif"
                          className="pointer-events-none select-none"
                          style={{ 
                            textShadow: '0 0 6px white, 0 0 6px white, 0 0 6px white, 0 0 8px white',
                            transition: 'font-size 0.15s'
                          }}
                        >
                          {officeNum}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </Card>

        {/* Overlay para cerrar tooltip en móviles */}
        {hoveredOffice && isMobile && (
          <div 
            className="fixed inset-0 z-40"
            onClick={() => {
              setHoveredOffice(null);
              setLastTappedOffice(null);
            }}
          />
        )}

        {/* Tooltip */}
        {hoveredOffice && (
          <div 
            className={`fixed z-50 bg-white rounded-lg shadow-2xl p-4 ${
              isMobile ? 'pointer-events-auto' : 'pointer-events-none'
            } ${
              hoveredOffice.status === 'available' 
                ? 'border-2 border-green-600' 
                : 'border-2 border-blue-500'
            }`}
            style={
              isMobile 
                ? {
                    // En móviles: centrado en la pantalla para mejor visibilidad
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    minWidth: '280px',
                    maxWidth: '90vw',
                    width: 'calc(100vw - 32px)',
                    margin: '0 16px'
                  }
                : {
                    // En desktop: posición relativa al cursor
                    left: `${tooltipPosition.x}px`,
                    top: `${tooltipPosition.y}px`,
                    transform: 'translate(-50%, -100%)',
                    minWidth: '280px',
                    maxWidth: '90vw'
                  }
            }
            onClick={(e) => {
              if (isMobile) {
                e.stopPropagation();
                // Segundo tap en el tooltip abre el modal
                if (hoveredOffice.status === 'available') {
                  setSelectedOffice(hoveredOffice);
                  setContactForm({
                    ...contactForm,
                    message: `Estoy interesado en la oficina ${hoveredOffice.office_number} (${hoveredOffice.square_meters}m², capacidad ${hoveredOffice.capacity || Math.floor(hoveredOffice.square_meters / 3)} personas)`
                  });
                  setShowContactModal(true);
                  setHoveredOffice(null);
                }
              }
            }}
          >
            <div className="space-y-2">
              <div className={`flex items-center justify-between pb-2 mb-3 ${
                hoveredOffice.status === 'available' 
                  ? 'border-b-2 border-green-600' 
                  : 'border-b-2 border-blue-500'
              }`}>
                <span className="font-secondary text-black font-bold text-lg">
                  Oficina {hoveredOffice.office_number}
                </span>
                {hoveredOffice.status === 'available' ? (
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded font-primary">
                    DISPONIBLE
                  </span>
                ) : (
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded font-primary">
                    OCUPADA
                  </span>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-primary text-gray-700">{hoveredOffice.location}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-primary text-gray-700">{hoveredOffice.square_meters}m²</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-primary text-gray-700">
                    Capacidad: {hoveredOffice.capacity || Math.floor(hoveredOffice.square_meters / 3)} personas
                  </span>
                </div>
                
                {hoveredOffice.status === 'available' && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="text-lg font-bold text-green-600 font-primary">
                      {formatUF(hoveredOffice.sale_value_uf)}
                    </span>
                  </div>
                )}
                
                {hoveredOffice.status === 'occupied' && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-blue-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-primary font-semibold">
                        Actualmente ocupada
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                      <span className="text-lg font-bold text-blue-600 font-primary">
                        {formatUF(hoveredOffice.sale_value_uf)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-primary mt-2">
                      Consulta disponibilidad futura
                    </p>
                  </div>
                )}
              </div>
              
              {/* Botón para solicitar información - disponible para todas las oficinas */}
              <div className="pt-3 border-t border-gray-200 mt-3">
                <div className={`text-xs font-primary text-center ${
                  isMobile 
                    ? hoveredOffice.status === 'available' 
                      ? 'text-green-600 font-semibold bg-green-50 px-3 py-2 rounded-md border border-green-200'
                      : 'text-blue-600 font-semibold bg-blue-50 px-3 py-2 rounded-md border border-blue-200'
                    : 'text-gray-500'
                }`}>
                  {isMobile 
                    ? hoveredOffice.status === 'available' 
                      ? '👆 Toca aquí para solicitar información'
                      : '👆 Toca aquí para consultar disponibilidad'
                    : hoveredOffice.status === 'available'
                      ? 'Click para solicitar más información'
                      : 'Click para consultar disponibilidad futura'
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Compact List - Todas las oficinas ordenadas */}
        <div className="mb-8 lg:hidden">
          <h3 className="text-xl font-bold text-black font-secondary uppercase mb-3">
            📱 Todas las Oficinas (Vista Móvil)
          </h3>
          <p className="text-sm text-gray-600 font-primary mb-3">
            Orden: {sortBy === 'custom' ? '✨ Personalizado' : sortBy === 'number' ? '🔢 Número' : sortBy === 'location' ? '📍 Ubicación' : '📐 Tamaño'}
          </p>
          <div className="space-y-2">
            {sortedAllOffices.map((office) => (
              <Card 
                key={office.id} 
                className={`border-gray-200 rounded-sm shadow-sm cursor-pointer hover:shadow-md ${
                  office.status === 'available' 
                    ? 'bg-green-50 border-green-300' 
                    : 'bg-blue-50 border-blue-200'
                } transition-all`}
                onClick={() => handleOfficeClick(office)}
              >
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`text-xl font-bold font-secondary ${
                        office.status === 'available' ? 'text-green-700' : 'text-blue-700'
                      }`}>
                        {office.office_number}
                      </div>
                      <div className="text-xs">
                        <span className={`px-2 py-1 rounded font-primary font-bold ${
                          office.status === 'available' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {office.status === 'available' ? 'DISPONIBLE' : 'OCUPADA'}
                        </span>
                      </div>
                    </div>
                    
                    <div className={`text-lg font-bold font-primary ${
                      office.status === 'available' ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {formatUF(office.sale_value_uf)}
                    </div>
                  </div>
                  
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-primary text-gray-700">
                    <div>
                      <span className="text-gray-500">📍</span> {office.location}
                    </div>
                    <div>
                      <span className="text-gray-500">📐</span> {office.square_meters}m²
                    </div>
                    <div>
                      <span className="text-gray-500">👥</span> {office.capacity || Math.floor(office.square_meters / 3)} pers.
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Resumen de Selección Flotante */}
        {selectedOffices.length > 0 && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
            <Card className="bg-gradient-to-br from-green-600 to-green-700 text-white border-0 shadow-2xl rounded-2xl overflow-hidden max-w-sm">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-6 h-6" />
                    <h4 className="text-xl font-black font-secondary uppercase">
                      Selección
                    </h4>
                  </div>
                  <button
                    onClick={() => setSelectedOffices([])}
                    className="p-1 hover:bg-white/20 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                    <span className="font-primary font-semibold">Oficinas:</span>
                    <span className="text-2xl font-black font-secondary">{selectedTotals.count}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                    <span className="font-primary font-semibold">Total m²:</span>
                    <span className="text-2xl font-black font-secondary">{selectedTotals.squareMeters.toFixed(1)}m²</span>
                  </div>
                  <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                    <span className="font-primary font-semibold">Capacidad:</span>
                    <span className="text-2xl font-black font-secondary">{selectedTotals.capacity}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                    <span className="font-primary font-semibold">Valor Total:</span>
                    <span className="text-2xl font-black font-secondary">{formatUF(selectedTotals.totalValue)}</span>
                  </div>
                </div>
                
                <Button
                  onClick={handleRequestMultipleQuote}
                  className="w-full bg-white text-green-600 hover:bg-gray-50 rounded-xl font-secondary uppercase tracking-wide py-6 shadow-lg hover:shadow-xl transition-all text-lg font-black"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Solicitar Cotización
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Available Offices List - List Format */}
        <div className="mb-12 hidden lg:block">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-3xl font-black text-gray-900 font-secondary uppercase">
              Lista de Oficinas Disponibles
            </h3>
            
            {/* Sort Indicator */}
            <div className="text-sm text-gray-600 font-primary">
              Orden: {sortBy === 'custom' ? '✨ Personalizado' : sortBy === 'number' ? '🔢 Número' : sortBy === 'location' ? '📍 Ubicación' : '📐 Tamaño'}
            </div>
          </div>
          
          {/* Lista compacta */}
          <div className="space-y-3">
            {sortedAvailableOffices.map((office) => {
              const isSelected = isOfficeSelected(office.id);
              return (
                <div
                  key={office.id}
                  className={`bg-white border-2 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 ${
                    isSelected ? 'border-green-500 ring-2 ring-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="flex items-center gap-4 p-4">
                    {/* Checkbox de selección */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOfficeSelection(office, e);
                      }}
                      className={`flex-shrink-0 p-2 rounded-lg transition-all ${
                        isSelected 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-white" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {/* Número de oficina */}
                    <div className="flex-shrink-0 w-24">
                      <div className="text-xl font-black text-gray-900 font-secondary">
                        {office.office_number}
                      </div>
                      <div className="text-xs text-gray-500 font-primary">OFICINA</div>
                    </div>

                    {/* Ubicación */}
                    <div className="flex-shrink-0 w-32">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-primary font-semibold text-gray-900">{office.location}</span>
                      </div>
                    </div>

                    {/* Dimensión */}
                    <div className="flex-shrink-0 w-28">
                      <div className="flex items-center gap-2 text-sm">
                        <Maximize2 className="w-4 h-4 text-gray-400" />
                        <span className="font-primary font-semibold text-gray-900">{office.square_meters}m²</span>
                      </div>
                    </div>

                    {/* Capacidad */}
                    <div className="flex-shrink-0 w-32">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="font-primary font-semibold text-gray-900">
                          {office.capacity || Math.floor(office.square_meters / 3)} personas
                        </span>
                      </div>
                    </div>

                    {/* Precio */}
                    <div className="flex-grow flex items-center justify-end gap-4">
                      <div className="text-right">
                        <div className="text-xs text-gray-500 font-primary mb-1">Precio de Venta</div>
                        <div className="text-2xl font-black text-green-600 font-primary">
                          {formatUF(office.sale_value_uf)}
                        </div>
                      </div>

                      {/* Botón de acción */}
                      <Button
                        onClick={() => handleOfficeClick(office)}
                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-secondary uppercase tracking-wide px-6 py-3 shadow-md hover:shadow-lg transition-all"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Solicitar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Occupied Offices List - List Format */}
        {occupiedOffices.length > 0 && (
          <div className="mb-12 hidden lg:block">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-3xl font-black text-gray-900 font-secondary uppercase">
                Oficinas Actualmente Ocupadas
              </h3>
              <span className="text-sm text-blue-600 font-primary bg-blue-50 px-3 py-1 rounded-full">
                Consulta disponibilidad futura
              </span>
            </div>
            
            {/* Lista compacta de ocupadas */}
            <div className="space-y-3">
              {occupiedOffices.map((office) => (
                <div
                  key={office.id}
                  className="bg-white border-2 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border-blue-200 hover:border-blue-400"
                >
                  <div className="flex items-center gap-4 p-4">
                    {/* Indicador de ocupada */}
                    <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    </div>

                    {/* Número de oficina */}
                    <div className="flex-shrink-0 w-24">
                      <div className="text-xl font-black text-gray-900 font-secondary">
                        {office.office_number}
                      </div>
                      <div className="text-xs text-blue-600 font-primary font-semibold">OCUPADA</div>
                    </div>

                    {/* Ubicación */}
                    <div className="flex-shrink-0 w-32">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-primary font-semibold text-gray-900">{office.location}</span>
                      </div>
                    </div>

                    {/* Dimensión */}
                    <div className="flex-shrink-0 w-28">
                      <div className="flex items-center gap-2 text-sm">
                        <Maximize2 className="w-4 h-4 text-gray-400" />
                        <span className="font-primary font-semibold text-gray-900">{office.square_meters}m²</span>
                      </div>
                    </div>

                    {/* Capacidad */}
                    <div className="flex-shrink-0 w-32">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="font-primary font-semibold text-gray-900">
                          {office.capacity || Math.floor(office.square_meters / 3)} personas
                        </span>
                      </div>
                    </div>

                    {/* Precio */}
                    <div className="flex-grow flex items-center justify-end gap-4">
                      <div className="text-right">
                        <div className="text-xs text-gray-500 font-primary mb-1">Valor de Referencia</div>
                        <div className="text-2xl font-black text-blue-600 font-primary">
                          {formatUF(office.sale_value_uf)}
                        </div>
                      </div>

                      {/* Botón de acción */}
                      <Button
                        onClick={() => handleOfficeClick(office)}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-secondary uppercase tracking-wide px-6 py-3 shadow-md hover:shadow-lg transition-all"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Consultar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact CTA */}
        <Card className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 text-white border-0 shadow-2xl rounded-2xl overflow-hidden">
          <div className="p-12 text-center relative">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent to-black/10"></div>
            <div className="relative z-10">
              <h3 className="text-4xl md:text-5xl font-black font-secondary uppercase mb-4 tracking-tight">
                ¿INTERESADO EN NUESTRAS OFICINAS?
              </h3>
              <p className="text-xl mb-8 font-primary max-w-2xl mx-auto leading-relaxed">
                Contáctanos y agenda una visita para conocer nuestras modernas instalaciones
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  className="bg-white text-orange-600 hover:bg-gray-50 rounded-xl font-secondary uppercase tracking-wide px-10 py-6 text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105"
                  onClick={() => {
                    setSelectedOffice(null);
                    setShowContactModal(true);
                  }}
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Contactar Ahora
                </Button>
                <Button 
                  variant="outline"
                  className="border-3 border-white text-white hover:bg-white hover:text-orange-600 rounded-xl font-secondary uppercase tracking-wide px-10 py-6 text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105"
                >
                  <PhoneIcon className="w-5 h-5 mr-2" />
                  Llamar Ahora
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </main>

      {/* Contact Modal */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent className="bg-white border-gray-200 text-black max-w-md">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl flex items-center gap-2">
              <Mail className="w-5 h-5 text-green-600" />
              Solicitar Información
            </DialogTitle>
            {selectedOffice && (
              <p className="text-sm text-gray-600 font-primary">
                Oficina {selectedOffice.office_number} - {selectedOffice.square_meters}m² - {formatUF(selectedOffice.sale_value_uf)}
              </p>
            )}
          </DialogHeader>
          <form onSubmit={handleSubmitContact} className="space-y-4 mt-4">
            <div>
              <Label className="text-black font-primary font-medium">Nombre completo *</Label>
              <Input
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                className="bg-white border-gray-300 text-black"
                placeholder="Juan Pérez"
                required
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Email *</Label>
              <Input
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                className="bg-white border-gray-300 text-black"
                placeholder="juan@empresa.cl"
                required
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Teléfono *</Label>
              <Input
                type="tel"
                value={contactForm.phone}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                className="bg-white border-gray-300 text-black"
                placeholder="+56 9 XXXX XXXX"
                required
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Mensaje</Label>
              <Textarea
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                className="bg-white border-gray-300 text-black min-h-24"
                placeholder="Cuéntanos más sobre tus necesidades..."
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white rounded-sm font-bold uppercase tracking-wide font-secondary py-6"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Enviar Solicitud
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <img src={LOGO_URL} alt="TNA Office" className="h-10 mx-auto mb-4 opacity-80" />
            <p className="text-sm font-primary">
              © 2024 TNA Office Business Center. Todos los derechos reservados.
            </p>
            <p className="text-xs text-gray-500 mt-2 font-primary">
              Av. Apoquindo, Piso 17 - Las Condes, Santiago - Chile
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
