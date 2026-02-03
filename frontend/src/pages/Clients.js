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
  Building2, 
  Users, 
  FileText, 
  Edit, 
  Trash2, 
  Star,
  User,
  Mail,
  Phone,
  Briefcase,
  Upload,
  Download,
  Calendar,
  AlertCircle,
  Eye,
  Save,
  X,
  Search,
  Home,
  Car,
  Package,
  RefreshCw,
  Bell,
  BellOff
} from 'lucide-react';
import { toast } from 'sonner';

export const Clients = () => {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [editingDocumentId, setEditingDocumentId] = useState(null);
  const [editingDocumentName, setEditingDocumentName] = useState('');
  const [editingContact, setEditingContact] = useState(null);
  const [offices, setOffices] = useState([]);
  const [parkingStorage, setParkingStorage] = useState([]);
  const [monthlyServices, setMonthlyServices] = useState([]);
  const [filterWithOffices, setFilterWithOffices] = useState(false);
  const [ufValue, setUfValue] = useState(38500); // Valor por defecto aproximado
  
  // Filtrar clientes por búsqueda y por oficinas
  const filteredClients = clients.filter(client => {
    // Filtro de búsqueda
    const matchesSearch = client.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.rut?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contacts?.some(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    // Filtro de oficinas
    const hasOffices = offices.some(o => o.client_id === client.id);
    const matchesOfficeFilter = !filterWithOffices || hasOffices;
    
    return matchesSearch && matchesOfficeFilter;
  });
  
  const [clientForm, setClientForm] = useState({
    company_name: '',
    rut: '',
    notes: ''
  });

  const [contactForm, setContactForm] = useState({
    name: '',
    position: '',
    phone: '',
    email: '',
    is_primary: false
  });

  const [documentForm, setDocumentForm] = useState({
    name: '',
    document_type: 'other',
    file_url: '',
    file_type: '',
    contract_start_date: '',
    contract_end_date: '',
    contract_months: '',
    notes: ''
  });
  const [editingDocument, setEditingDocument] = useState(null);

  const loadUfValue = async () => {
    try {
      const response = await apiClient.get('/uf');
      const data = response.data;
      if (data.serie && data.serie.length > 0) {
        setUfValue(data.serie[0].valor);
      }
    } catch (error) {
      console.error('Error loading UF value:', error);
      // Mantiene el valor por defecto
    }
  };

  const loadClients = async () => {
    try {
      const response = await apiClient.get('/clients');
      setClients(response.data);
    } catch (error) {
      toast.error('Error al cargar clientes');
    }
  };

  const loadOffices = async () => {
    try {
      const response = await apiClient.get('/offices');
      setOffices(response.data);
    } catch (error) {
      console.error('Error al cargar oficinas');
    }
  };

  const loadParkingStorage = async () => {
    try {
      const response = await apiClient.get('/parking-storage');
      setParkingStorage(response.data);
    } catch (error) {
      console.error('Error loading parking/storage:', error);
    }
  };

  const loadMonthlyServices = async () => {
    try {
      const response = await apiClient.get('/monthly-services');
      setMonthlyServices(response.data);
    } catch (error) {
      console.error('Error loading monthly services:', error);
    }
  };

  useEffect(() => {
    loadClients();
    loadOffices();
    loadParkingStorage();
    loadMonthlyServices();
    loadUfValue();
  }, []);

  // Obtener estacionamientos y bodegas del cliente
  const getClientParkingStorage = (clientId) => {
    return parkingStorage.filter(item => item.client_id === clientId);
  };

  // Obtener servicios mensuales del cliente
  const getClientMonthlyServices = (clientId) => {
    return monthlyServices.filter(service => service.client_id === clientId);
  };

  const getClientOffices = (clientId) => {
    return offices.filter(office => office.client_id === clientId);
  };

  const handleClientSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedClient) {
        await apiClient.put(`/clients/${selectedClient.id}`, clientForm);
        toast.success('Cliente actualizado');
      } else {
        await apiClient.post('/clients', clientForm);
        toast.success('Cliente creado');
      }
      setShowClientModal(false);
      resetClientForm();
      loadClients();
    } catch (error) {
      toast.error('Error al guardar cliente');
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await apiClient.put(`/clients/${selectedClient.id}/contacts/${editingContact.id}`, contactForm);
        toast.success('Contacto actualizado');
      } else {
        await apiClient.post(`/clients/${selectedClient.id}/contacts`, contactForm);
        toast.success('Contacto agregado');
      }
      setShowContactModal(false);
      resetContactForm();
      loadClients();
      // Reload selected client
      const response = await apiClient.get(`/clients/${selectedClient.id}`);
      setSelectedClient(response.data);
    } catch (error) {
      toast.error('Error al guardar contacto');
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no debe superar 10MB');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentForm({
          ...documentForm,
          file_url: reader.result,
          file_type: file.type,
          name: documentForm.name || file.name
        });
        toast.success('Archivo cargado');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Error al cargar archivo');
    }
  };

  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/clients/${selectedClient.id}/documents`, documentForm);
      toast.success('Documento agregado');
      setShowDocumentModal(false);
      resetDocumentForm();
      // Reload selected client
      const response = await apiClient.get(`/clients/${selectedClient.id}`);
      setSelectedClient(response.data);
    } catch (error) {
      toast.error('Error al guardar documento');
    }
  };

  const deleteContact = async (contactId) => {
    if (!window.confirm('¿Eliminar este contacto?')) return;
    try {
      await apiClient.delete(`/clients/${selectedClient.id}/contacts/${contactId}`);
      toast.success('Contacto eliminado');
      const response = await apiClient.get(`/clients/${selectedClient.id}`);
      setSelectedClient(response.data);
    } catch (error) {
      toast.error('Error al eliminar contacto');
    }
  };

  const deleteDocument = async (documentId) => {
    if (!window.confirm('¿Eliminar este documento?')) return;
    try {
      await apiClient.delete(`/clients/${selectedClient.id}/documents/${documentId}`);
      toast.success('Documento eliminado');
      const response = await apiClient.get(`/clients/${selectedClient.id}`);
      setSelectedClient(response.data);
    } catch (error) {
      toast.error('Error al eliminar documento');
    }
  };

  const toggleDocumentNotifications = async (documentId, currentState) => {
    try {
      await apiClient.put(`/clients/${selectedClient.id}/documents/${documentId}`, {
        notifications_enabled: !currentState
      });
      toast.success(!currentState ? 'Notificaciones activadas' : 'Notificaciones desactivadas');
      const response = await apiClient.get(`/clients/${selectedClient.id}`);
      setSelectedClient(response.data);
    } catch (error) {
      toast.error('Error al actualizar notificaciones');
    }
  };

  const startEditingDocument = (doc) => {
    setEditingDocumentId(doc.id);
    setEditingDocumentName(doc.name);
  };

  const cancelEditingDocument = () => {
    setEditingDocumentId(null);
    setEditingDocumentName('');
  };

  const saveDocumentName = async (documentId) => {
    if (!editingDocumentName.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    try {
      await apiClient.put(`/clients/${selectedClient.id}/documents/${documentId}?name=${encodeURIComponent(editingDocumentName)}`);
      toast.success('Nombre actualizado');
      const response = await apiClient.get(`/clients/${selectedClient.id}`);
      setSelectedClient(response.data);
      cancelEditingDocument();
    } catch (error) {
      toast.error('Error al actualizar nombre');
    }
  };

  const openPreview = (doc) => {
    setPreviewDocument(doc);
    setShowPreviewModal(true);
  };

  // Calcular fecha de término basada en meses de vigencia
  const calculateEndDate = (startDate, months) => {
    if (!startDate || !months) return '';
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + parseInt(months));
    return date.toISOString().split('T')[0];
  };

  // Manejar cambio de meses de vigencia
  const handleMonthsChange = (months) => {
    const endDate = calculateEndDate(documentForm.contract_start_date, months);
    setDocumentForm({
      ...documentForm,
      contract_months: months,
      contract_end_date: endDate
    });
  };

  // Manejar cambio de fecha inicio (recalcular fecha término si hay meses)
  const handleStartDateChange = (startDate) => {
    const endDate = documentForm.contract_months 
      ? calculateEndDate(startDate, documentForm.contract_months)
      : documentForm.contract_end_date;
    setDocumentForm({
      ...documentForm,
      contract_start_date: startDate,
      contract_end_date: endDate
    });
  };

  // Abrir modal para editar documento existente
  const openEditDocument = (doc) => {
    setEditingDocument(doc);
    setDocumentForm({
      name: doc.name,
      document_type: doc.document_type,
      file_url: doc.file_url,
      file_type: doc.file_type,
      contract_start_date: doc.contract_start_date || '',
      contract_end_date: doc.contract_end_date || '',
      contract_months: '',
      notes: doc.notes || ''
    });
    setShowDocumentModal(true);
  };

  // Guardar cambios en documento existente
  const handleDocumentUpdate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put(`/clients/${selectedClient.id}/documents/${editingDocument.id}`, {
        name: documentForm.name,
        contract_start_date: documentForm.contract_start_date || null,
        contract_end_date: documentForm.contract_end_date || null,
        notes: documentForm.notes || null
      });
      toast.success('Documento actualizado');
      setShowDocumentModal(false);
      setEditingDocument(null);
      resetDocumentForm();
      const response = await apiClient.get(`/clients/${selectedClient.id}`);
      setSelectedClient(response.data);
    } catch (error) {
      toast.error('Error al actualizar documento');
    }
  };

  const deleteClient = async (clientId) => {
    if (!window.confirm('¿Eliminar este cliente?')) return;
    try {
      await apiClient.delete(`/clients/${clientId}`);
      toast.success('Cliente eliminado');
      setSelectedClient(null);
      loadClients();
    } catch (error) {
      toast.error('Error al eliminar cliente');
    }
  };

  const resetClientForm = () => {
    setClientForm({ company_name: '', rut: '', notes: '' });
    setSelectedClient(null);
  };

  const resetContactForm = () => {
    setContactForm({ name: '', position: '', phone: '', email: '', is_primary: false });
    setEditingContact(null);
  };

  const resetDocumentForm = () => {
    setDocumentForm({
      name: '',
      document_type: 'other',
      file_url: '',
      file_type: '',
      contract_start_date: '',
      contract_end_date: '',
      contract_months: '',
      notes: ''
    });
    setEditingDocument(null);
  };

  const calculateContractMonths = (startDate, endDate) => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return months;
  };

  const calculateRemainingMonths = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
    return months > 0 ? months : 0;
  };

  // Contar oficinas asignadas a un cliente
  const getClientOfficesCount = (clientId) => {
    return offices.filter(office => office.client_id === clientId).length;
  };

  return (
    <div className="space-y-6" data-testid="clients-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-secondary text-4xl md:text-5xl font-black uppercase text-black tracking-tight">
            ADMINISTRACIÓN DE CLIENTES
          </h1>
          <div className="h-1 w-32 tna-gradient mt-4"></div>
        </div>
        <Button
          data-testid="add-client-button"
          onClick={() => {
            resetClientForm();
            setShowClientModal(true);
          }}
          className="bg-black text-white hover:bg-gray-800 rounded-sm font-bold uppercase tracking-wide font-secondary"
        >
          <Plus className="w-4 h-4 mr-2" />
          NUEVO CLIENTE
        </Button>
      </div>

      {/* Métricas de Recurrencia */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="bg-white border-gray-200 rounded-sm">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-primary uppercase">Clientes Recurrentes</p>
                <p className="text-2xl font-bold text-black font-primary">
                  {clients.filter(client => {
                    const hasOffices = offices.some(o => o.client_id === client.id);
                    const hasParking = parkingStorage.some(p => p.client_id === client.id);
                    const hasServices = monthlyServices.some(s => s.client_id === client.id);
                    return hasOffices || hasParking || hasServices;
                  }).length}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200 rounded-sm">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-primary uppercase">Total Recurrencia</p>
                {(() => {
                  const totalUF = clients.reduce((total, client) => {
                    const totalOficinas = offices.filter(o => o.client_id === client.id).reduce((sum, o) => sum + (o.billed_value_uf || 0), 0);
                    const totalParking = parkingStorage.filter(p => p.client_id === client.id).reduce((sum, p) => sum + (p.billed_value_uf || 0), 0);
                    const totalServicios = monthlyServices.filter(s => s.client_id === client.id).reduce((sum, s) => sum + (s.billed_value_uf || 0), 0);
                    return total + totalOficinas + totalParking + totalServicios;
                  }, 0);
                  const totalCLP = totalUF * ufValue;
                  return (
                    <>
                      <p className="text-2xl font-bold text-green-600 font-primary">
                        {totalUF.toFixed(2)} UF/mes
                      </p>
                      <p className="text-sm text-gray-500 font-primary">
                        ${totalCLP.toLocaleString('es-CL', { maximumFractionDigits: 0 })} CLP
                      </p>
                    </>
                  );
                })()}
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <span className="text-green-600 font-bold text-lg">UF</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clients List */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-white border-gray-200 rounded-sm">
            <CardHeader className="border-b border-gray-200 space-y-3">
              <CardTitle className="font-secondary uppercase text-black text-sm">
                EMPRESAS ({filteredClients.length} de {clients.length})
              </CardTitle>
              {/* Buscador */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, RUT o contacto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-50 border-gray-200 text-sm font-primary"
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
              
              {/* Filtro por oficinas */}
              <button
                onClick={() => setFilterWithOffices(!filterWithOffices)}
                className={`p-1.5 rounded transition-all ${
                  filterWithOffices 
                    ? 'bg-green-100 border border-green-300' 
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                }`}
                title={filterWithOffices ? 'Mostrando solo clientes con oficinas' : 'Filtrar clientes con oficinas asignadas'}
              >
                <Home className={`w-3.5 h-3.5 ${filterWithOffices ? 'text-green-600' : 'text-gray-400'}`} />
              </button>
            </CardHeader>
            <CardContent className="p-0 max-h-[600px] overflow-y-auto">
              {filteredClients.map((client) => {
                const officesCount = getClientOfficesCount(client.id);
                const clientParkingStorage = getClientParkingStorage(client.id);
                const parkingCount = clientParkingStorage.filter(ps => ps.type === 'parking').length;
                const storageCount = clientParkingStorage.filter(ps => ps.type === 'storage').length;
                const servicesCount = getClientMonthlyServices(client.id).length;
                const hasNotifications = client.documents?.some(doc => doc.notifications_enabled);
                return (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectedClient?.id === client.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center relative">
                        <Building2 className="w-5 h-5 text-white" strokeWidth={2} />
                        {officesCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white" title={`${officesCount} oficina(s) asignada(s)`}>
                            <Home className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-primary font-bold text-black text-sm">{client.company_name}</h3>
                          {officesCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-primary font-semibold flex items-center gap-1">
                              <Home className="w-2.5 h-2.5" />
                              {officesCount}
                            </span>
                          )}
                          {parkingCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-primary font-semibold flex items-center gap-1" title={`${parkingCount} estacionamiento(s)`}>
                              <Car className="w-2.5 h-2.5" />
                              {parkingCount}
                            </span>
                          )}
                          {storageCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500 text-white rounded font-primary font-semibold flex items-center gap-1" title={`${storageCount} bodega(s)`}>
                              <Package className="w-2.5 h-2.5" />
                              {storageCount}
                            </span>
                          )}
                          {servicesCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-primary font-semibold flex items-center gap-1" title={`${servicesCount} servicio(s) mensual(es)`}>
                              <RefreshCw className="w-2.5 h-2.5" />
                              {servicesCount}
                            </span>
                          )}
                          {hasNotifications && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-rose-500 text-white rounded font-primary font-semibold flex items-center gap-1" title="Contrato con notificaciones activas">
                              <Bell className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-primary">
                          {(client.contacts || []).length} contactos • {(client.documents || []).length} documentos
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredClients.length === 0 && (
                <div className="p-8 text-center">
                  <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-primary text-sm">
                    {searchTerm ? `No se encontraron clientes para "${searchTerm}"` : 'No hay clientes registrados'}
                  </p>
                  {searchTerm && (
                    <Button
                      onClick={() => setSearchTerm('')}
                      variant="outline"
                      size="sm"
                      className="mt-2 text-xs"
                    >
                      Limpiar búsqueda
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Client Details */}
        <div className="lg:col-span-2 space-y-4">
          {selectedClient ? (
            <>
              {/* Client Info */}
              <Card className="bg-white border-gray-200 rounded-sm">
                <CardHeader className="border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="font-secondary uppercase text-black text-xl">
                        {selectedClient.company_name}
                      </CardTitle>
                      {selectedClient.rut && (
                        <p className="text-sm text-gray-600 font-primary mt-0.5">
                          RUT: {selectedClient.rut}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Building2 className="w-4 h-4 text-orange-500" />
                        <p className="text-sm text-gray-700 font-primary font-medium">
                          {getClientOffices(selectedClient.id).length} {getClientOffices(selectedClient.id).length === 1 ? 'oficina asignada' : 'oficinas asignadas'}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500 font-primary mt-1">
                        Cliente desde {new Date(selectedClient.created_at).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setClientForm({
                            company_name: selectedClient.company_name,
                            rut: selectedClient.rut || '',
                            notes: selectedClient.notes
                          });
                          setShowClientModal(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="bg-white border-gray-300 text-black hover:bg-gray-50 rounded-sm"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => deleteClient(selectedClient.id)}
                        variant="outline"
                        size="sm"
                        className="bg-white border-red-300 text-red-600 hover:bg-red-50 rounded-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className={selectedClient.notes ? "pt-4" : "pt-0"}>
                  {selectedClient.notes && (
                    <p className="text-gray-600 font-primary text-sm mb-4">{selectedClient.notes}</p>
                  )}
                  {/* Gran Total Mensual con Costos y Margen */}
                  {(() => {
                    const clientOffices = getClientOffices(selectedClient.id);
                    const clientParking = getClientParkingStorage(selectedClient.id);
                    const clientServices = getClientMonthlyServices(selectedClient.id);
                    
                    const totalFacturadoOficinas = clientOffices.reduce((sum, o) => sum + (o.billed_value_uf || 0), 0);
                    const totalFacturadoParking = clientParking.reduce((sum, item) => sum + (item.billed_value_uf || 0), 0);
                    const totalFacturadoServicios = clientServices.reduce((sum, s) => sum + (s.billed_value_uf || 0), 0);
                    const granTotalFacturado = totalFacturadoOficinas + totalFacturadoParking + totalFacturadoServicios;
                    
                    const totalCostoOficinas = clientOffices.reduce((sum, o) => sum + (o.cost_uf || 0), 0);
                    const totalCostoParking = clientParking.reduce((sum, item) => sum + (item.cost_uf || 0), 0);
                    const totalCostoServicios = clientServices.reduce((sum, s) => sum + (s.cost_uf || 0), 0);
                    const granTotalCosto = totalCostoOficinas + totalCostoParking + totalCostoServicios;
                    
                    const margenEjercicio = granTotalFacturado - granTotalCosto;
                    
                    if (granTotalFacturado > 0 || granTotalCosto > 0) {
                      return (
                        <div className="space-y-2 mb-4">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="p-3 bg-green-50 rounded-sm border border-green-200">
                              <span className="text-xs font-medium text-green-700 font-primary block">Facturado</span>
                              <span className="text-lg font-bold text-green-600 font-primary">{granTotalFacturado.toFixed(2)} UF</span>
                            </div>
                            <div className="p-3 bg-red-50 rounded-sm border border-red-200">
                              <span className="text-xs font-medium text-red-700 font-primary block">Costo</span>
                              <span className="text-lg font-bold text-red-600 font-primary">{granTotalCosto.toFixed(2)} UF</span>
                            </div>
                            <div className={`p-3 rounded-sm border ${margenEjercicio >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                              <span className={`text-xs font-medium font-primary block ${margenEjercicio >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Margen</span>
                              <span className={`text-lg font-bold font-primary ${margenEjercicio >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{margenEjercicio.toFixed(2)} UF</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </CardContent>
              </Card>

              {/* Oficinas Asignadas */}
              {getClientOffices(selectedClient.id).length > 0 && (
                <Card className="bg-white border-gray-200 rounded-sm">
                  <CardHeader className="py-3 px-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-primary text-sm text-gray-600 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Oficinas ({getClientOffices(selectedClient.id).length})
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-red-500 font-primary">
                          Costo: {getClientOffices(selectedClient.id).reduce((sum, o) => sum + (o.cost_uf || 0), 0).toFixed(2)} UF
                        </span>
                        <span className="text-sm font-bold text-green-600 font-primary">
                          {getClientOffices(selectedClient.id).reduce((sum, o) => sum + (o.billed_value_uf || 0), 0).toFixed(2)} UF/mes
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-gray-100">
                      {getClientOffices(selectedClient.id).map((office) => (
                        <div key={office.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-black font-primary">Oficina {office.office_number}</span>
                            <span className="text-xs text-gray-400">{office.square_meters}m² • {office.capacity}p</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{office.location}</span>
                            <span className="text-xs text-red-400">C: {office.cost_uf || 0}</span>
                            <span className="text-sm font-medium text-green-600">{office.billed_value_uf || 0} UF</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Estacionamientos y Bodegas */}
              {getClientParkingStorage(selectedClient.id).length > 0 && (
                <Card className="bg-white border-gray-200 rounded-sm">
                  <CardHeader className="py-3 px-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-primary text-sm text-gray-600 flex items-center gap-2">
                        <Car className="w-4 h-4" />
                        Estacionamientos y Bodegas ({getClientParkingStorage(selectedClient.id).length})
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-red-500 font-primary">
                          Costo: {getClientParkingStorage(selectedClient.id).reduce((sum, item) => sum + (item.cost_uf || 0), 0).toFixed(2)} UF
                        </span>
                        <span className="text-sm font-bold text-green-600 font-primary">
                          {getClientParkingStorage(selectedClient.id).reduce((sum, item) => sum + (item.billed_value_uf || 0), 0).toFixed(2)} UF/mes
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-gray-100">
                      {getClientParkingStorage(selectedClient.id).map((item) => (
                        <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            {item.type === 'parking' ? (
                              <Car className="w-4 h-4 text-blue-500" />
                            ) : (
                              <Package className="w-4 h-4 text-orange-500" />
                            )}
                            <span className="text-sm font-medium text-black font-primary">{item.number}</span>
                            <span className="text-xs text-gray-400">{item.location}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              item.status === 'occupied' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {item.status === 'occupied' ? 'Arrendado' : 'Disponible'}
                            </span>
                            <span className="text-xs text-red-400">C: {item.cost_uf || 0}</span>
                            <span className="text-sm font-medium text-green-600">{item.billed_value_uf} UF</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Servicios Mensuales */}
              {getClientMonthlyServices(selectedClient.id).length > 0 && (
                <Card className="bg-white border-gray-200 rounded-sm">
                  <CardHeader className="py-3 px-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-primary text-sm text-gray-600 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Servicios Mensuales ({getClientMonthlyServices(selectedClient.id).length})
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-red-500 font-primary">
                          Costo: {getClientMonthlyServices(selectedClient.id).reduce((sum, s) => sum + (s.cost_uf || 0), 0).toFixed(2)} UF
                        </span>
                        <span className="text-sm font-bold text-green-600 font-primary">
                          {getClientMonthlyServices(selectedClient.id).reduce((sum, s) => sum + (s.billed_value_uf || 0), 0).toFixed(2)} UF/mes
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-gray-100">
                      {getClientMonthlyServices(selectedClient.id).map((service) => (
                        <div key={service.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <RefreshCw className="w-4 h-4 text-purple-500" />
                            <div>
                              <span className="text-sm font-medium text-black font-primary">{service.service_name}</span>
                              {service.category && (
                                <span className="ml-2 text-xs text-gray-400">{service.category}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              service.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {service.status === 'active' ? 'Activo' : 'Inactivo'}
                            </span>
                            <span className="text-xs text-red-400">C: {service.cost_uf || 0}</span>
                            <span className="text-sm font-medium text-green-600">{service.billed_value_uf} UF</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contacts */}
              <Card className="bg-white border-gray-200 rounded-sm">
                <CardHeader className="border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-secondary uppercase text-black text-sm flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      CONTACTOS
                    </CardTitle>
                    <Button
                      onClick={() => {
                        resetContactForm();
                        setShowContactModal(true);
                      }}
                      size="sm"
                      className="bg-black text-white hover:bg-gray-800 rounded-sm font-secondary"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      AGREGAR
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {(selectedClient.contacts || []).map((contact) => (
                      <div key={contact.id} className="p-4 bg-gray-50 rounded-sm border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-primary font-bold text-black">{contact.name}</h4>
                              {contact.is_primary && (
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-primary flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-current" />
                                  Principal
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 text-sm text-gray-600 font-primary">
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4" />
                                {contact.position}
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                {contact.email}
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                {contact.phone}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                setEditingContact(contact);
                                setContactForm(contact);
                                setShowContactModal(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="bg-white border-gray-300 text-black hover:bg-gray-50 rounded-sm"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={() => deleteContact(contact.id)}
                              variant="outline"
                              size="sm"
                              className="bg-white border-red-300 text-red-600 hover:bg-red-50 rounded-sm"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(selectedClient.contacts || []).length === 0 && (
                      <p className="text-center py-8 text-gray-500 font-primary text-sm">
                        No hay contactos registrados
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Documents */}
              <Card className="bg-white border-gray-200 rounded-sm">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-primary text-sm text-gray-600 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Documentos ({selectedClient.documents.length})
                    </CardTitle>
                    <Button
                      onClick={() => {
                        resetDocumentForm();
                        setShowDocumentModal(true);
                      }}
                      size="sm"
                      variant="ghost"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-100">
                    {selectedClient.documents.map((doc) => {
                      const remainingMonths = calculateRemainingMonths(doc.contract_end_date);
                      const isContract = doc.document_type === 'contract';
                      const isExpiringSoon = remainingMonths <= 2 && remainingMonths > 0;
                      
                      return (
                        <div key={doc.id} className="px-4 py-3 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FileText className={`w-4 h-4 shrink-0 ${isContract ? 'text-blue-500' : 'text-gray-400'}`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  {editingDocumentId === doc.id ? (
                                    <div className="flex items-center gap-2 flex-1">
                                      <Input
                                        value={editingDocumentName}
                                        onChange={(e) => setEditingDocumentName(e.target.value)}
                                        className="h-7 text-sm font-primary"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') saveDocumentName(doc.id);
                                          if (e.key === 'Escape') cancelEditingDocument();
                                        }}
                                      />
                                      <button onClick={() => saveDocumentName(doc.id)} className="text-green-600 hover:text-green-700">
                                        <Save className="w-4 h-4" />
                                      </button>
                                      <button onClick={cancelEditingDocument} className="text-gray-400 hover:text-gray-600">
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-sm font-medium text-black font-primary truncate">{doc.name}</span>
                                      <button
                                        onClick={() => startEditingDocument(doc)}
                                        className="text-gray-300 hover:text-blue-600 shrink-0"
                                        title="Editar nombre"
                                      >
                                        <Edit className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-gray-400">
                                    {isContract ? 'Contrato' : 'Documento'}
                                  </span>
                                  {isContract && doc.contract_end_date && (
                                    <>
                                      <span className="text-xs text-gray-300">•</span>
                                      <span className={`text-xs ${isExpiringSoon ? 'text-red-500' : 'text-gray-400'}`}>
                                        {remainingMonths > 0 ? `${remainingMonths} meses restantes` : 'Vencido'}
                                      </span>
                                      {isExpiringSoon && <AlertCircle className="w-3 h-3 text-yellow-500" />}
                                    </>
                                  )}
                                  {doc.notes && (
                                    <>
                                      <span className="text-xs text-gray-300">•</span>
                                      <span className="text-xs text-gray-400 truncate max-w-[150px]" title={doc.notes}>{doc.notes}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isContract && (
                                <button
                                  onClick={() => toggleDocumentNotifications(doc.id, doc.notifications_enabled)}
                                  className={`p-1.5 rounded transition-colors ${
                                    doc.notifications_enabled 
                                      ? 'text-orange-500 bg-orange-50 hover:bg-orange-100' 
                                      : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
                                  }`}
                                  title={doc.notifications_enabled ? 'Desactivar notificaciones' : 'Activar notificaciones de vencimiento'}
                                >
                                  {doc.notifications_enabled ? (
                                    <Bell className="w-3.5 h-3.5" />
                                  ) : (
                                    <BellOff className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() => openEditDocument(doc)}
                                className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded"
                                title="Editar"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openPreview(doc)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Vista previa"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = doc.file_url;
                                  link.download = doc.name;
                                  link.click();
                                }}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                title="Descargar"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteDocument(doc.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {selectedClient.documents.length === 0 && (
                      <p className="text-center py-6 text-gray-400 font-primary text-sm">
                        No hay documentos
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-white border-gray-200 rounded-sm">
              <CardContent className="py-32 text-center">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-primary">Selecciona un cliente para ver sus detalles</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Client Modal */}
      <Dialog open={showClientModal} onOpenChange={setShowClientModal}>
        <DialogContent className="bg-white border-gray-200 text-black">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl text-black">
              {selectedClient ? 'EDITAR CLIENTE' : 'NUEVO CLIENTE'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleClientSubmit} className="space-y-4 mt-4">
            <div>
              <Label className="text-black font-primary font-medium">Nombre de la empresa</Label>
              <Input
                value={clientForm.company_name}
                onChange={(e) => setClientForm({ ...clientForm, company_name: e.target.value })}
                className="bg-white border-gray-300 text-black"
                required
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">RUT</Label>
              <Input
                value={clientForm.rut}
                onChange={(e) => setClientForm({ ...clientForm, rut: e.target.value })}
                className="bg-white border-gray-300 text-black"
                placeholder="Ej: 12.345.678-9"
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Notas</Label>
              <Textarea
                value={clientForm.notes}
                onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                className="bg-white border-gray-300 text-black"
                rows={3}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-black text-white hover:bg-gray-800 rounded-sm font-bold uppercase tracking-wide font-secondary"
            >
              {selectedClient ? 'ACTUALIZAR' : 'CREAR'} CLIENTE
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contact Modal */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent className="bg-white border-gray-200 text-black">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl text-black">
              {editingContact ? 'EDITAR CONTACTO' : 'NUEVO CONTACTO'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleContactSubmit} className="space-y-4 mt-4">
            <div>
              <Label className="text-black font-primary font-medium">Nombre completo</Label>
              <Input
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                className="bg-white border-gray-300 text-black"
                required
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Cargo</Label>
              <Input
                value={contactForm.position}
                onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })}
                className="bg-white border-gray-300 text-black"
                required
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Email</Label>
              <Input
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                className="bg-white border-gray-300 text-black"
                required
              />
            </div>
            <div>
              <Label className="text-black font-primary font-medium">Teléfono</Label>
              <Input
                value={contactForm.phone}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                className="bg-white border-gray-300 text-black"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_primary"
                checked={contactForm.is_primary}
                onChange={(e) => setContactForm({ ...contactForm, is_primary: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="is_primary" className="text-black font-primary font-medium cursor-pointer">
                Marcar como contacto principal
              </Label>
            </div>
            <Button
              type="submit"
              className="w-full bg-black text-white hover:bg-gray-800 rounded-sm font-bold uppercase tracking-wide font-secondary"
            >
              {editingContact ? 'ACTUALIZAR' : 'AGREGAR'} CONTACTO
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Document Modal */}
      <Dialog open={showDocumentModal} onOpenChange={(open) => {
        setShowDocumentModal(open);
        if (!open) {
          resetDocumentForm();
        }
      }}>
        <DialogContent className="bg-white border-gray-200 text-black max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl text-black">
              {editingDocument ? 'EDITAR DOCUMENTO' : 'AGREGAR DOCUMENTO'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={editingDocument ? handleDocumentUpdate : handleDocumentSubmit} className="space-y-4 mt-4">
            <div>
              <Label className="text-black font-primary font-medium">Nombre del documento</Label>
              <Input
                value={documentForm.name}
                onChange={(e) => setDocumentForm({ ...documentForm, name: e.target.value })}
                className="bg-white border-gray-300 text-black"
                required
              />
            </div>
            
            {!editingDocument && (
              <div>
                <Label className="text-black font-primary font-medium">Tipo de documento</Label>
                <select
                  value={documentForm.document_type}
                  onChange={(e) => setDocumentForm({ ...documentForm, document_type: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-sm bg-white text-black"
                  required
                >
                  <option value="other">Documento general</option>
                  <option value="contract">Contrato</option>
                  <option value="invoice">Factura</option>
                </select>
              </div>
            )}

            {(documentForm.document_type === 'contract' || editingDocument?.document_type === 'contract') && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-secondary uppercase text-sm font-bold text-blue-900">
                  Vigencia del Contrato
                </h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-black font-primary font-medium">Fecha inicio</Label>
                    <Input
                      type="date"
                      value={documentForm.contract_start_date}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="bg-white border-gray-300 text-black"
                    />
                  </div>
                  <div>
                    <Label className="text-black font-primary font-medium">Vigencia (meses)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="120"
                      placeholder="Ej: 12"
                      value={documentForm.contract_months}
                      onChange={(e) => handleMonthsChange(e.target.value)}
                      className="bg-white border-gray-300 text-black"
                    />
                  </div>
                  <div>
                    <Label className="text-black font-primary font-medium">Fecha término</Label>
                    <Input
                      type="date"
                      value={documentForm.contract_end_date}
                      onChange={(e) => setDocumentForm({ ...documentForm, contract_end_date: e.target.value, contract_months: '' })}
                      className="bg-white border-gray-300 text-black"
                    />
                  </div>
                </div>
                
                {documentForm.contract_start_date && documentForm.contract_end_date && (
                  <div className="p-3 bg-white rounded border border-blue-200">
                    <p className="text-sm text-blue-800 font-primary">
                      <strong>Resumen:</strong> Contrato de{' '}
                      <span className="font-bold text-blue-600">
                        {Math.round((new Date(documentForm.contract_end_date) - new Date(documentForm.contract_start_date)) / (1000 * 60 * 60 * 24 * 30))} meses
                      </span>{' '}
                      desde {new Date(documentForm.contract_start_date).toLocaleDateString('es-CL')} hasta {new Date(documentForm.contract_end_date).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Campo de Notas */}
            <div>
              <Label className="text-black font-primary font-medium">Notas del documento</Label>
              <Textarea
                value={documentForm.notes}
                onChange={(e) => setDocumentForm({ ...documentForm, notes: e.target.value })}
                className="bg-white border-gray-300 text-black"
                placeholder="Agregar notas o comentarios sobre este documento..."
                rows={2}
              />
            </div>

            {!editingDocument && (
              <div>
                <Label className="text-black font-primary font-medium">Archivo</Label>
                <Input
                  type="file"
                  onChange={handleDocumentUpload}
                  className="bg-white border-gray-300 text-black file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                  required={!documentForm.file_url}
                />
                <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, XLS, XLSX, TXT hasta 10MB</p>
              </div>
            )}

            {editingDocument && (
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <p className="text-sm text-gray-600 font-primary">
                  <strong>Archivo actual:</strong> {editingDocument.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  El archivo no se puede cambiar. Para reemplazarlo, elimine este documento y suba uno nuevo.
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={!editingDocument && !documentForm.file_url}
              className="w-full bg-black text-white hover:bg-gray-800 rounded-sm font-bold uppercase tracking-wide font-secondary"
            >
              {editingDocument ? 'GUARDAR CAMBIOS' : 'AGREGAR DOCUMENTO'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="bg-white border-gray-200 text-black max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl text-black flex items-center gap-2">
              <Eye className="w-5 h-5" />
              VISTA PREVIA: {previewDocument?.name}
            </DialogTitle>
          </DialogHeader>
          
          {previewDocument && (
            <div className="mt-4">
              {/* Info del documento */}
              <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <FileText className="w-8 h-8 text-blue-600" />
                <div className="flex-1">
                  <p className="font-primary font-bold text-black">{previewDocument.name}</p>
                  <p className="text-sm text-gray-500 font-primary">
                    Tipo: {previewDocument.file_type || 'Desconocido'} • 
                    Subido: {new Date(previewDocument.uploaded_at).toLocaleDateString('es-CL')}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = previewDocument.file_url;
                    link.download = previewDocument.name;
                    link.click();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </Button>
              </div>

              {/* Preview content */}
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-100" style={{ height: '500px' }}>
                {previewDocument.file_type?.startsWith('image/') ? (
                  <img 
                    src={previewDocument.file_url} 
                    alt={previewDocument.name}
                    className="w-full h-full object-contain"
                  />
                ) : previewDocument.file_type === 'application/pdf' ? (
                  <iframe
                    src={previewDocument.file_url}
                    title={previewDocument.name}
                    className="w-full h-full"
                    style={{ border: 'none' }}
                  />
                ) : previewDocument.file_url?.startsWith('data:image') ? (
                  <img 
                    src={previewDocument.file_url} 
                    alt={previewDocument.name}
                    className="w-full h-full object-contain"
                  />
                ) : previewDocument.file_url?.startsWith('data:application/pdf') ? (
                  <iframe
                    src={previewDocument.file_url}
                    title={previewDocument.name}
                    className="w-full h-full"
                    style={{ border: 'none' }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <FileText className="w-16 h-16 mb-4 text-gray-300" />
                    <p className="font-primary text-lg">Vista previa no disponible</p>
                    <p className="font-primary text-sm mt-2">Tipo de archivo: {previewDocument.file_type || 'Desconocido'}</p>
                    <Button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = previewDocument.file_url;
                        link.download = previewDocument.name;
                        link.click();
                      }}
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar archivo
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
