import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUser, logout } from '../utils/auth';
import apiClient from '../utils/api';
import { 
  LayoutDashboard, 
  Calendar, 
  Package, 
  Users, 
  TrendingUp, 
  FileText, 
  Bell, 
  LogOut,
  Menu,
  X,
  Building2,
  CalendarDays,
  Car,
  RefreshCw,
  GripVertical,
  Settings2,
  Check,
  Shield
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const LOGO_URL = '/logo-tna.png';

const MENU_ORDER_KEY = 'tna_menu_order';

const defaultMenuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'comisionista'], moduleId: 'dashboard' },
  { path: '/resources', label: 'Recursos', icon: Calendar, roles: ['admin', 'comisionista'], moduleId: 'resources' },
  { path: '/products', label: 'Productos', icon: Package, roles: ['admin'], moduleId: 'products' },
  { path: '/clients', label: 'Clientes', icon: Users, roles: ['admin'], moduleId: 'clients' },
  { path: '/offices', label: 'Oficinas', icon: Building2, roles: ['admin'], moduleId: 'offices' },
  { path: '/parking-storage', label: 'Estac. y Bodegas', icon: Car, roles: ['admin'], moduleId: 'parking-storage' },
  { path: '/monthly-services', label: 'Servicios Mensuales', icon: RefreshCw, roles: ['admin'], moduleId: 'monthly-services' },
  { path: '/quotes', label: 'Cotizaciones', icon: FileText, roles: ['admin', 'comisionista'], showQuotesBadge: true, moduleId: 'quotes' },
  { path: '/comisionistas', label: 'Comisionistas', icon: Users, roles: ['admin'], moduleId: 'comisionistas' },
  { path: '/tickets', label: 'Ventas', icon: TrendingUp, roles: ['admin', 'comisionista'], moduleId: 'tickets' },
  { path: '/requests', label: 'Solicitudes', icon: Bell, roles: ['admin', 'comisionista'], showBadge: true, moduleId: 'requests' },
  { path: '/reports', label: 'Reportes', icon: FileText, roles: ['admin'], moduleId: 'reports' },
  { path: '/users', label: 'Usuarios', icon: Shield, roles: ['admin'], moduleId: 'users' },
];

// Componente para cada item del menú que es arrastrable
const SortableMenuItem = ({ item, isActive, showNotification, newRequestsCount, pendingQuotesCount, onClick, editMode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.path, disabled: !editMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  const Icon = item.icon;
  
  // Determinar si mostrar badge para este item
  const showRequestsBadge = item.showBadge && newRequestsCount > 0;
  const showQuotesBadge = item.showQuotesBadge && pendingQuotesCount > 0;
  const badgeCount = showRequestsBadge ? newRequestsCount : (showQuotesBadge ? pendingQuotesCount : 0);
  const hasBadge = showRequestsBadge || showQuotesBadge;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sidebar-item w-full ${isActive ? 'active' : ''} relative group flex items-center`}
    >
      {editMode && (
        <button
          {...attributes}
          {...listeners}
          className="p-1 mr-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing transition-opacity"
          title="Arrastrar para reordenar"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={onClick}
        className="flex items-center gap-3 flex-1 py-2"
      >
        <div className="relative">
          <Icon 
            className={`w-5 h-5 ${hasBadge ? 'text-[#FF8A00]' : ''}`} 
            strokeWidth={1.5} 
          />
          {hasBadge && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FF8A00] rounded-full animate-pulse"></span>
          )}
        </div>
        <span className="font-primary font-medium text-sm">{item.label}</span>
        {hasBadge && (
          <span className="ml-auto bg-[#FF8A00] text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
            {badgeCount}
          </span>
        )}
      </button>
    </div>
  );
};

export const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newRequestsCount, setNewRequestsCount] = useState(0);
  const [pendingQuotesCount, setPendingQuotesCount] = useState(0);
  const [menuItems, setMenuItems] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [userAllowedModules, setUserAllowedModules] = useState([]);

  // Cargar perfil del usuario y sus módulos permitidos
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user?.id) {
        try {
          const response = await apiClient.get(`/users/${user.id}`);
          const userData = response.data;
          if (userData.allowed_modules && userData.allowed_modules.length > 0) {
            setUserAllowedModules(userData.allowed_modules);
          } else if (user.role === 'admin') {
            // Admin tiene acceso a todo por defecto
            setUserAllowedModules(defaultMenuItems.map(item => item.moduleId));
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          // Si falla, usar permisos por rol (comportamiento legacy)
          if (user.role === 'admin') {
            setUserAllowedModules(defaultMenuItems.map(item => item.moduleId));
          }
        }
      }
    };
    loadUserProfile();
  }, [user?.id, user?.role]);

  // Cargar orden del menú desde localStorage
  useEffect(() => {
    const savedOrder = localStorage.getItem(MENU_ORDER_KEY);
    if (savedOrder) {
      try {
        const orderPaths = JSON.parse(savedOrder);
        // Reordenar según el orden guardado
        const reorderedItems = orderPaths
          .map(path => defaultMenuItems.find(item => item.path === path))
          .filter(Boolean);
        // Agregar items nuevos que no estaban en el orden guardado
        const newItems = defaultMenuItems.filter(
          item => !orderPaths.includes(item.path)
        );
        setMenuItems([...reorderedItems, ...newItems]);
      } catch {
        setMenuItems(defaultMenuItems);
      }
    } else {
      setMenuItems(defaultMenuItems);
    }
  }, []);

  const filteredMenuItems = menuItems.filter(item => {
    // Primero verificar el rol
    if (!item.roles.includes(user?.role)) return false;
    
    // Si hay módulos permitidos configurados, verificar
    if (userAllowedModules.length > 0 && item.moduleId) {
      return userAllowedModules.includes(item.moduleId);
    }
    
    // Si no hay configuración de módulos, usar comportamiento por rol
    return true;
  });

  // Sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Manejar el fin del drag
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setMenuItems((items) => {
        const oldIndex = items.findIndex(item => item.path === active.id);
        const newIndex = items.findIndex(item => item.path === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Guardar nuevo orden en localStorage
        const orderPaths = newItems.map(item => item.path);
        localStorage.setItem(MENU_ORDER_KEY, JSON.stringify(orderPaths));
        
        return newItems;
      });
    }
  };

  // Cargar número de solicitudes nuevas y pre-cotizaciones pendientes
  useEffect(() => {
    const loadCounts = async () => {
      try {
        // Cargar solicitudes nuevas
        const requestsResponse = await apiClient.get('/requests');
        const newCount = requestsResponse.data.filter(r => r.status === 'new').length;
        setNewRequestsCount(newCount);
        
        // Cargar pre-cotizaciones pendientes
        const quotesResponse = await apiClient.get('/quotes/pending-count');
        setPendingQuotesCount(quotesResponse.data.count || 0);
      } catch (error) {
        console.error('Error al cargar contadores:', error);
      }
    };

    loadCounts();
    
    // Recargar cada 30 segundos
    const interval = setInterval(loadCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#050505] border-r border-zinc-900
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-zinc-900">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <img 
                  src={LOGO_URL} 
                  alt="TNA Office" 
                  className="h-10 w-auto object-contain"
                />
                <div className="h-1 w-16 tna-gradient mt-3"></div>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mt-4">
              <p className="text-white font-medium font-primary text-sm">{user?.name}</p>
              <p className="text-zinc-500 text-xs font-primary uppercase">{user?.role}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            {/* Botón para activar/desactivar modo edición */}
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => setEditMode(!editMode)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-primary transition-all ${
                  editMode 
                    ? 'bg-green-600 text-white' 
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                }`}
                title={editMode ? 'Finalizar edición' : 'Ordenar menú'}
              >
                {editMode ? (
                  <>
                    <Check className="w-3 h-3" />
                    Listo
                  </>
                ) : (
                  <>
                    <Settings2 className="w-3 h-3" />
                    Ordenar
                  </>
                )}
              </button>
            </div>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredMenuItems.map(item => item.path)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {filteredMenuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const showNotification = item.showBadge && newRequestsCount > 0;
                    
                    return (
                      <SortableMenuItem
                        key={item.path}
                        item={item}
                        isActive={isActive}
                        showNotification={showNotification}
                        newRequestsCount={newRequestsCount}
                        pendingQuotesCount={pendingQuotesCount}
                        editMode={editMode}
                        onClick={() => {
                          navigate(item.path);
                          setSidebarOpen(false);
                        }}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-900">
            <Button
              data-testid="logout-button"
              onClick={handleLogout}
              variant="outline"
              className="w-full justify-start gap-3 bg-transparent border-zinc-700 text-white hover:bg-zinc-900 rounded-sm font-primary"
            >
              <LogOut className="w-5 h-5" strokeWidth={1.5} />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 p-4 lg:p-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-black"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <p className="text-gray-600 text-sm font-primary">Badajoz 45, Piso 17, Las Condes</p>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 bg-gray-50">
          {children}
        </main>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};
