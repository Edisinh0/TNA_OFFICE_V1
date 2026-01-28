import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../utils/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Plus, Search, X, Building2, Trash2, Edit2, Package, DollarSign, CheckCircle, AlertCircle, CreditCard, Banknote, FileText, Receipt, History, ChevronDown, ChevronUp, TrendingUp, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { getUser } from '../utils/auth';

const PAYMENT_METHODS = [
  { id: 'getnet', label: 'Getnet', icon: CreditCard },
  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'factura_mensual', label: 'Agregar a Factura Mensual', icon: FileText },
];

export const Tickets = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [comisionistas, setComisionistas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Estados para facturas
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [showInvoiceHistory, setShowInvoiceHistory] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  // Estados para métricas y filtros
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterPending, setFilterPending] = useState(false);
  
  // Estados para items de la venta
  const [ticketItems, setTicketItems] = useState([]);
  
  // Estados para autocompletado de producto
  const [productSearch, setProductSearch] = useState('');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const productInputRef = useRef(null);
  
  // Estados para búsqueda de cliente
  const [clientSearch, setClientSearch] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const clientInputRef = useRef(null);
  
  const [form, setForm] = useState({
    comisionista_id: '',
    client_name: '',
    client_email: '',
    notes: ''
  });
  
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const user = getUser();

  // Generar lista de meses disponibles (últimos 12 meses)
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

  const loadData = async () => {
    try {
      const [ticketsRes, productsRes, comisionistasRes, clientsRes, pendingInvoicesRes] = await Promise.all([
        apiClient.get('/tickets'),
        apiClient.get('/products'),
        apiClient.get('/comisionistas'),
        apiClient.get('/clients'),
        apiClient.get('/invoices/pending')
      ]);
      setTickets(ticketsRes.data);
      setProducts(productsRes.data);
      setComisionistas(comisionistasRes.data);
      setClients(clientsRes.data);
      setPendingInvoices(pendingInvoicesRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    }
  };

  const loadInvoiceHistory = async () => {
    try {
      const res = await apiClient.get('/invoices/history');
      setInvoiceHistory(res.data);
    } catch (error) {
      toast.error('Error al cargar historial');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Detectar parámetro newSale para abrir modal automáticamente
  useEffect(() => {
    if (searchParams.get('newSale') === 'true') {
      setShowModal(true);
      // Limpiar el parámetro de la URL
      searchParams.delete('newSale');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Filtrar productos según búsqueda y categoría
  const filteredProducts = products.filter(p => {
    const searchTerm = productSearch.toLowerCase();
    const matchesSearch = !searchTerm || 
                         p.name.toLowerCase().includes(searchTerm) ||
                         p.category.toLowerCase().includes(searchTerm);
    const matchesCategory = !selectedCategory || selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Mostrar sugerencias cuando hay categoría seleccionada O cuando hay texto de búsqueda
  const shouldShowSuggestions = showProductSuggestions && 
    (productSearch || (selectedCategory && selectedCategory !== 'all'));

  // Filtrar clientes según búsqueda
  const filteredClients = clients.filter(c => 
    c.company_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.rut && c.rut.toLowerCase().includes(clientSearch.toLowerCase()))
  );

  const handleAddProduct = (product) => {
    // Verificar si el producto ya está en la lista
    const existingIndex = ticketItems.findIndex(item => item.product_id === product.id);
    
    if (existingIndex >= 0) {
      // Incrementar cantidad si ya existe
      const updatedItems = [...ticketItems];
      updatedItems[existingIndex].quantity += 1;
      updatedItems[existingIndex].subtotal = updatedItems[existingIndex].quantity * product.sale_price;
      setTicketItems(updatedItems);
    } else {
      // Agregar nuevo producto
      setTicketItems([...ticketItems, {
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        quantity: 1,
        unit_price: product.sale_price,
        subtotal: product.sale_price
      }]);
    }
    
    setProductSearch('');
    setShowProductSuggestions(false);
    toast.success(`${product.name} agregado`);
  };

  const handleRemoveItem = (index) => {
    const updatedItems = ticketItems.filter((_, i) => i !== index);
    setTicketItems(updatedItems);
  };

  const handleUpdateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    const updatedItems = [...ticketItems];
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].subtotal = newQuantity * updatedItems[index].unit_price;
    setTicketItems(updatedItems);
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setClientSearch(client.company_name);
    setForm({ ...form, client_name: client.company_name, client_email: client.contacts?.[0]?.email || '' });
    setShowClientSuggestions(false);
  };

  const clearClient = () => {
    setSelectedClient(null);
    setClientSearch('');
    setForm({ ...form, client_name: '', client_email: '' });
  };

  const calculateTotal = () => {
    return ticketItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (ticketItems.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }
    
    if (!form.client_name && !clientSearch) {
      toast.error('Ingresa el nombre del cliente');
      return;
    }
    
    const ticketData = {
      items: ticketItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      })),
      comisionista_id: form.comisionista_id || '',
      client_id: selectedClient?.id || '',  // Incluir ID del cliente si fue seleccionado
      client_name: form.client_name || clientSearch,
      client_email: form.client_email || '',
      notes: form.notes || ''
    };
    
    try {
      if (editingTicket) {
        await apiClient.put(`/tickets/${editingTicket.id}`, ticketData);
        toast.success('Venta actualizada');
      } else {
        await apiClient.post('/tickets', ticketData);
        toast.success('Venta creada');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(editingTicket ? 'Error al actualizar venta' : 'Error al crear venta');
    }
  };

  const resetForm = () => {
    setForm({
      comisionista_id: '',
      client_name: '',
      client_email: '',
      notes: ''
    });
    setTicketItems([]);
    setSelectedClient(null);
    setClientSearch('');
    setProductSearch('');
    setSelectedCategory('');
    setEditingTicket(null);
  };

  const handleEdit = (ticket) => {
    setEditingTicket(ticket);
    setTicketItems(ticket.items.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      category: item.category,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal
    })));
    setForm({
      comisionista_id: ticket.comisionista_id || '',
      client_name: ticket.client_name,
      client_email: ticket.client_email || '',
      notes: ticket.notes || ''
    });
    setClientSearch(ticket.client_name);
    setShowModal(true);
  };

  const handleDelete = async (ticketId) => {
    try {
      await apiClient.delete(`/tickets/${ticketId}`);
      toast.success('Venta eliminada');
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      toast.error('Error al eliminar venta');
    }
  };

  const handlePayment = async (paymentMethod) => {
    if (!paymentModal) return;
    
    try {
      await apiClient.put(`/tickets/${paymentModal.ticketId}/payment?payment_status=paid&payment_method=${paymentMethod}`);
      toast.success(`Pago registrado: ${PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}`);
      setPaymentModal(null);
      loadData();
    } catch (error) {
      toast.error('Error al actualizar estado de pago');
    }
  };

  const updateCommissionStatus = async (ticketId, status) => {
    try {
      await apiClient.put(`/tickets/${ticketId}/commission?commission_status=${status}`);
      toast.success('Estado de comisión actualizado');
      loadData();
    } catch (error) {
      toast.error('Error al actualizar comisión');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  const getPaymentMethodLabel = (method) => {
    const found = PAYMENT_METHODS.find(m => m.id === method);
    return found ? found.label : method;
  };

  const markInvoiceAsInvoiced = async (invoiceId) => {
    try {
      await apiClient.put(`/invoices/${invoiceId}/status?status=invoiced`);
      toast.success('Factura marcada como FACTURADA');
      loadData();
      if (showInvoiceHistory) {
        loadInvoiceHistory();
      }
    } catch (error) {
      toast.error('Error al actualizar factura');
    }
  };

  const toggleInvoiceHistory = () => {
    if (!showInvoiceHistory) {
      loadInvoiceHistory();
    }
    setShowInvoiceHistory(!showInvoiceHistory);
  };

  // Calcular métricas de ventas
  const calculateMetrics = () => {
    // Parsear mes seleccionado
    const [year, month] = selectedMonth.split('-').map(Number);
    const selectedMonthIndex = month - 1; // Los meses en JS son 0-indexed
    
    // Filtrar ventas del mes seleccionado
    const monthSales = tickets.filter(ticket => {
      const saleDate = new Date(ticket.ticket_date);
      return saleDate.getMonth() === selectedMonthIndex && saleDate.getFullYear() === year;
    });
    
    // Total del mes
    const totalMonth = monthSales.reduce((sum, ticket) => sum + ticket.total_amount, 0);
    
    // Ventas pendientes de pago (todas, no solo del mes)
    const pendingSales = tickets.filter(ticket => ticket.payment_status === 'pending');
    const totalPending = pendingSales.reduce((sum, ticket) => sum + ticket.total_amount, 0);
    
    // Desglose por forma de pago (solo pagadas)
    const paidSales = tickets.filter(ticket => ticket.payment_status === 'paid');
    const byPaymentMethod = {
      getnet: { count: 0, total: 0 },
      efectivo: { count: 0, total: 0 },
      factura_mensual: { count: 0, total: 0 },
      otro: { count: 0, total: 0 }
    };
    
    paidSales.forEach(ticket => {
      const method = ticket.payment_method || 'otro';
      if (byPaymentMethod[method]) {
        byPaymentMethod[method].count++;
        byPaymentMethod[method].total += ticket.total_amount;
      } else {
        byPaymentMethod.otro.count++;
        byPaymentMethod.otro.total += ticket.total_amount;
      }
    });
    
    return {
      totalMonth,
      monthSalesCount: monthSales.length,
      pendingCount: pendingSales.length,
      totalPending,
      paidCount: paidSales.length,
      byPaymentMethod
    };
  };

  const metrics = calculateMetrics();

  // Filtrar ventas para mostrar
  const filteredTickets = filterPending 
    ? tickets.filter(ticket => ticket.payment_status === 'pending')
    : tickets;

  return (
    <div className="space-y-6" data-testid="ventas-page">
      {/* TÍTULO Y BOTÓN NUEVA VENTA - SIEMPRE EN LA PARTE SUPERIOR */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-secondary text-4xl md:text-5xl font-black uppercase text-black tracking-tight">
            VENTAS
          </h1>
          <div className="h-1 w-32 tna-gradient mt-4"></div>
        </div>
        {user?.role !== 'comisionista' && (
          <Button
            data-testid="add-venta-button"
            onClick={() => setShowModal(true)}
            className="bg-white text-black hover:bg-zinc-200 rounded-sm font-bold uppercase tracking-wide font-secondary"
          >
            <Plus className="w-4 h-4 mr-2" />
            NUEVA VENTA
          </Button>
        )}
      </div>

      {/* MÉTRICAS DE VENTAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total del Mes con selector */}
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
                <p className="text-2xl font-bold text-black font-secondary">{formatCurrency(metrics.totalMonth)}</p>
                <p className="text-xs text-gray-400 font-primary">{metrics.monthSalesCount} ventas</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-sm flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pendientes de Pago - Clickeable para filtrar */}
        <Card 
          className={`bg-white border-gray-200 rounded-sm cursor-pointer transition-all hover:shadow-md ${
            filterPending ? 'ring-2 ring-amber-400 border-amber-400' : ''
          }`}
          onClick={() => setFilterPending(!filterPending)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500 font-primary uppercase">Pendientes de Pago</p>
                  {filterPending && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-primary">
                      Filtro activo
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-black font-secondary">{formatCurrency(metrics.totalPending)}</p>
                <p className="text-xs text-gray-400 font-primary">{metrics.pendingCount} ventas • Click para filtrar</p>
              </div>
              <div className={`w-12 h-12 rounded-sm flex items-center justify-center ${
                filterPending ? 'bg-amber-400' : 'bg-amber-100'
              }`}>
                <Clock className={`w-6 h-6 ${filterPending ? 'text-white' : 'text-amber-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Por Forma de Pago */}
        <Card className="bg-white border-gray-200 rounded-sm lg:col-span-2">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-primary uppercase mb-3">Formas de Pago</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CreditCard className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-primary text-gray-600">Getnet</span>
                </div>
                <p className="font-bold text-black font-secondary">{formatCurrency(metrics.byPaymentMethod.getnet.total)}</p>
                <p className="text-xs text-gray-400 font-primary">{metrics.byPaymentMethod.getnet.count} ventas</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Banknote className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-primary text-gray-600">Efectivo</span>
                </div>
                <p className="font-bold text-black font-secondary">{formatCurrency(metrics.byPaymentMethod.efectivo.total)}</p>
                <p className="text-xs text-gray-400 font-primary">{metrics.byPaymentMethod.efectivo.count} ventas</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <FileText className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-primary text-gray-600">Factura</span>
                </div>
                <p className="font-bold text-black font-secondary">{formatCurrency(metrics.byPaymentMethod.factura_mensual.total)}</p>
                <p className="text-xs text-gray-400 font-primary">{metrics.byPaymentMethod.factura_mensual.count} ventas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECCIÓN DE FACTURAS PENDIENTES */}
      {pendingInvoices.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-amber-600" />
            <h2 className="font-secondary text-lg font-bold text-amber-800 uppercase">
              Facturas Pendientes de Facturar ({pendingInvoices.length})
            </h2>
          </div>
          <div className="space-y-3">
            {pendingInvoices.map((invoice) => (
              <Card key={invoice.id} className="bg-white border-amber-200 rounded-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Building2 className="w-5 h-5 text-amber-600" />
                        <span className="font-secondary font-bold text-black">{invoice.client_name}</span>
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-sm font-primary">
                          PENDIENTE DE FACTURAR
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 font-primary mb-2">
                        {invoice.items.length} producto(s) • {invoice.sales_ids.length} venta(s)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {invoice.items.slice(0, 5).map((item, idx) => (
                          <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-sm font-primary">
                            {item.quantity}x {item.product_name}
                          </span>
                        ))}
                        {invoice.items.length > 5 && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-sm font-primary">
                            +{invoice.items.length - 5} más
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <div className="text-xs text-gray-500 font-primary">Total a Facturar</div>
                        <div className="text-xl font-bold text-black font-secondary">
                          {formatCurrency(invoice.total_amount)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedInvoice(invoice)}
                          className="text-gray-600 font-secondary text-xs"
                        >
                          VER DETALLE
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => markInvoiceAsInvoiced(invoice.id)}
                          className="bg-green-600 hover:bg-green-700 text-white font-secondary text-xs"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          MARCAR FACTURADA
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* HISTORIAL DE FACTURAS */}
      <div className="border border-gray-200 rounded-sm">
        <button
          onClick={toggleInvoiceHistory}
          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" />
            <span className="font-secondary font-bold text-gray-700 uppercase">
              Historial de Facturas
            </span>
            {invoiceHistory.length > 0 && (
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-sm font-primary">
                {invoiceHistory.length}
              </span>
            )}
          </div>
          {showInvoiceHistory ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>
        
        {showInvoiceHistory && (
          <div className="p-4 border-t border-gray-200 bg-white">
            {invoiceHistory.length > 0 ? (
              <div className="space-y-3">
                {invoiceHistory.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-sm">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <span className="font-primary font-medium text-black">{invoice.client_name}</span>
                        <div className="text-xs text-gray-500 font-primary">
                          Facturada el {new Date(invoice.invoiced_at).toLocaleDateString('es-CL')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-secondary font-bold text-black">{formatCurrency(invoice.total_amount)}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedInvoice(invoice)}
                        className="text-gray-500 text-xs"
                      >
                        Ver
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center font-primary py-4">No hay facturas en el historial</p>
            )}
          </div>
        )}
      </div>

      {/* LISTA DE VENTAS */}
      {filterPending && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-sm px-4 py-2">
          <span className="text-sm font-primary text-amber-800">
            Mostrando solo ventas pendientes de pago ({filteredTickets.length})
          </span>
          <button
            onClick={() => setFilterPending(false)}
            className="text-xs text-amber-700 hover:text-amber-900 font-primary underline"
          >
            Mostrar todas
          </button>
        </div>
      )}
      
      <div className="space-y-4">
        {filteredTickets.map((ticket) => (
          <Card key={ticket.id} className="bg-white border-gray-200 rounded-sm overflow-hidden">
            <CardContent className="p-0">
              {/* Header de la venta */}
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-secondary font-bold text-lg text-black">
                    VENTA #{ticket.ticket_number}
                  </span>
                  <span className="text-gray-500 text-sm font-primary">
                    {new Date(ticket.ticket_date).toLocaleDateString('es-CL')}
                  </span>
                </div>
                {user?.role === 'admin' && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(ticket)}
                      className="text-gray-600 hover:text-black"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirm(ticket.id)}
                      className="text-gray-600 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Contenido de la venta */}
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Items de la venta */}
                  <div className="lg:col-span-2">
                    <div className="text-xs text-gray-500 font-primary mb-2 uppercase">Productos</div>
                    <div className="space-y-2">
                      {ticket.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-orange-500" />
                            <span className="font-primary text-black">
                              {item.quantity}x {item.product_name}
                            </span>
                            <span className="text-xs text-gray-400">[{item.category}]</span>
                          </div>
                          <span className="font-primary text-gray-600">
                            {formatCurrency(item.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Cliente */}
                  <div>
                    <div className="text-xs text-gray-500 font-primary mb-2 uppercase">Cliente</div>
                    <div className="text-black font-primary font-medium">{ticket.client_name}</div>
                    {ticket.client_email && (
                      <div className="text-gray-500 text-xs font-primary">{ticket.client_email}</div>
                    )}
                    {ticket.comisionista_name && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500 font-primary">Comisionista</div>
                        <div className="text-black font-primary text-sm">{ticket.comisionista_name}</div>
                        <div className="text-[#00E5FF] font-bold text-sm">{formatCurrency(ticket.total_commission)}</div>
                      </div>
                    )}
                  </div>
                  
                  {/* Total y acciones */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <div className="text-xs text-gray-500 font-primary">Total</div>
                      <div className="text-2xl font-bold text-black font-secondary">
                        {formatCurrency(ticket.total_amount)}
                      </div>
                    </div>
                    
                    {user?.role === 'admin' && (
                      <div className="flex gap-2">
                        {ticket.payment_status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => setPaymentModal({ 
                              ticketId: ticket.id, 
                              ticketNumber: ticket.ticket_number,
                              hasClientId: !!ticket.client_id
                            })}
                            className="bg-green-900 hover:bg-green-800 text-white rounded-sm text-xs font-secondary"
                          >
                            <DollarSign className="w-3 h-3 mr-1" />
                            PAGAR
                          </Button>
                        )}
                        {ticket.payment_status === 'paid' && ticket.commission_status === 'pending' && ticket.comisionista_id && (
                          <Button
                            size="sm"
                            onClick={() => updateCommissionStatus(ticket.id, 'paid')}
                            className="bg-blue-900 hover:bg-blue-800 text-white rounded-sm text-xs font-secondary"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            COMISIÓN
                          </Button>
                        )}
                      </div>
                    )}
                    
                    <div className="flex gap-2 flex-wrap justify-end">
                      <span className={`text-xs px-2 py-1 rounded-sm font-primary ${
                        ticket.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {ticket.payment_status === 'paid' 
                          ? `✓ ${ticket.payment_method ? getPaymentMethodLabel(ticket.payment_method) : 'Pagado'}` 
                          : 'Pendiente'}
                      </span>
                      {ticket.comisionista_id && (
                        <span className={`text-xs px-2 py-1 rounded-sm font-primary ${
                          ticket.commission_status === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          Com: {ticket.commission_status === 'paid' ? '✓ Pagada' : 'Pendiente'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTickets.length === 0 && (
        <Card className="bg-white border-gray-200 rounded-sm">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 font-primary">
              {filterPending ? 'No hay ventas pendientes de pago' : 'No hay ventas registradas'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de creación/edición */}
      <Dialog open={showModal} onOpenChange={(open) => {
        setShowModal(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="bg-white border-gray-200 text-black max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl text-black">
              {editingTicket ? 'EDITAR VENTA' : 'NUEVA VENTA'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Sección de agregar productos */}
            <div className="border border-gray-200 rounded-sm p-4 bg-gray-50">
              <Label className="text-black font-primary font-medium mb-3 block">Agregar Productos</Label>
              
              {/* Filtro de categoría */}
              <div className="flex gap-3 mb-3">
                <Select 
                  value={selectedCategory} 
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    setShowProductSuggestions(true);
                  }}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-black w-48">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300 text-black max-h-60">
                    <SelectItem value="all">Todas</SelectItem>
                    {[...new Set(products.map(p => p.category))].sort().map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Búsqueda de producto */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    ref={productInputRef}
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductSuggestions(true);
                    }}
                    onFocus={() => setShowProductSuggestions(true)}
                    className="bg-white border-gray-300 text-black pl-10"
                    placeholder="Buscar producto..."
                  />
                  
                  {/* Lista de sugerencias - muestra cuando hay categoría seleccionada o texto de búsqueda */}
                  {shouldShowSuggestions && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-sm shadow-lg max-h-48 overflow-y-auto">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.slice(0, 10).map(product => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => handleAddProduct(product)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="text-xs text-orange-600 font-primary">[{product.category}]</span>
                                <span className="ml-2 font-primary text-black">{product.name}</span>
                              </div>
                              <span className="text-green-600 font-bold font-primary">{formatCurrency(product.sale_price)}</span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 text-sm font-primary">
                          No se encontraron productos
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Lista de items de la venta */}
            {ticketItems.length > 0 && (
              <div className="border border-gray-200 rounded-sm overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 font-secondary text-sm uppercase text-gray-600">
                  Productos en la venta ({ticketItems.length})
                </div>
                <div className="divide-y divide-gray-100">
                  {ticketItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between px-4 py-3 bg-white">
                      <div className="flex items-center gap-3 flex-1">
                        <Package className="w-4 h-4 text-orange-500" />
                        <div>
                          <span className="font-primary text-black">{item.product_name}</span>
                          <span className="text-xs text-gray-400 ml-2">[{item.category}]</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                            className="h-7 w-7 p-0"
                          >
                            -
                          </Button>
                          <span className="w-8 text-center font-primary">{item.quantity}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                            className="h-7 w-7 p-0"
                          >
                            +
                          </Button>
                        </div>
                        
                        <span className="font-primary font-bold text-black w-24 text-right">
                          {formatCurrency(item.subtotal)}
                        </span>
                        
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveItem(index)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-t border-gray-200">
                  <span className="font-secondary uppercase text-gray-600">Total</span>
                  <span className="font-secondary text-xl font-bold text-black">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            )}

            {ticketItems.length === 0 && (
              <div className="border border-dashed border-gray-300 rounded-sm py-8 text-center">
                <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 font-primary text-sm">Busca y agrega productos a la venta</p>
              </div>
            )}

            {/* Comisionista */}
            <div>
              <Label className="text-black font-primary font-medium">Comisionista (opcional)</Label>
              <Select value={form.comisionista_id || 'none'} onValueChange={(value) => setForm({ ...form, comisionista_id: value === 'none' ? '' : value })}>
                <SelectTrigger className="bg-white border-gray-300 text-black">
                  <SelectValue placeholder="Sin comisionista" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300 text-black">
                  <SelectItem value="none">Sin comisionista</SelectItem>
                  {comisionistas.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cliente */}
            <div className="relative">
              <Label className="text-black font-primary font-medium">Cliente *</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  ref={clientInputRef}
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setForm({ ...form, client_name: e.target.value });
                    setShowClientSuggestions(true);
                    if (!e.target.value) clearClient();
                  }}
                  onFocus={() => setShowClientSuggestions(true)}
                  className="bg-white border-gray-300 text-black pl-10 pr-10"
                  placeholder="Buscar cliente o escribir nombre..."
                  required
                />
                {selectedClient && (
                  <button
                    type="button"
                    onClick={clearClient}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {showClientSuggestions && clientSearch && filteredClients.length > 0 && !selectedClient && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-sm shadow-lg max-h-48 overflow-y-auto">
                  {filteredClients.slice(0, 8).map(client => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleSelectClient(client)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-500" />
                        <span className="font-primary text-black font-medium">{client.company_name}</span>
                        {client.rut && <span className="text-xs text-gray-500">{client.rut}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {selectedClient && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-sm">
                  <p className="text-sm font-primary flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <span className="font-bold text-black">{selectedClient.company_name}</span>
                    {selectedClient.rut && <span className="text-gray-500">({selectedClient.rut})</span>}
                  </p>
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <Label className="text-black font-primary font-medium">Email (opcional)</Label>
              <Input
                type="email"
                value={form.client_email}
                onChange={(e) => setForm({ ...form, client_email: e.target.value })}
                className="bg-white border-gray-300 text-black"
              />
            </div>

            {/* Notas */}
            <div>
              <Label className="text-black font-primary font-medium">Notas (opcional)</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="bg-white border-gray-300 text-black"
                rows={2}
              />
            </div>

            <Button
              type="submit"
              disabled={ticketItems.length === 0}
              className="w-full bg-black text-white hover:bg-gray-800 rounded-sm font-bold uppercase tracking-wide font-secondary disabled:opacity-50"
            >
              {editingTicket ? 'ACTUALIZAR VENTA' : 'CREAR VENTA'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-white border-gray-200 text-black max-w-md">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl text-black flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              ELIMINAR VENTA
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="font-primary text-gray-600">
              ¿Estás seguro de que deseas eliminar esta venta? Esta acción no se puede deshacer.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="font-secondary uppercase"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => handleDelete(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700 text-white font-secondary uppercase"
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de forma de pago */}
      <Dialog open={!!paymentModal} onOpenChange={() => setPaymentModal(null)}>
        <DialogContent className="bg-white border-gray-200 text-black max-w-md">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl text-black flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              REGISTRAR PAGO - VENTA #{paymentModal?.ticketNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="font-primary text-gray-600 mb-4">
              Selecciona la forma de pago:
            </p>
            <div className="space-y-3">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                // Solo mostrar "Agregar a Factura Mensual" si el cliente está registrado
                const isInvoiceMethod = method.id === 'factura_mensual';
                const isDisabled = isInvoiceMethod && !paymentModal?.hasClientId;
                
                if (isDisabled) {
                  return (
                    <div
                      key={method.id}
                      className="w-full flex items-center gap-4 p-4 border border-gray-100 rounded-sm bg-gray-50 opacity-50 cursor-not-allowed"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <span className="font-primary font-medium text-gray-400">{method.label}</span>
                        <p className="text-xs text-gray-400 font-primary">Solo disponible para clientes registrados</p>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <button
                    key={method.id}
                    onClick={() => handlePayment(method.id)}
                    className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-sm hover:bg-gray-50 hover:border-green-500 transition-colors"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <span className="font-primary font-medium text-black">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setPaymentModal(null)}
              className="font-secondary uppercase"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de detalle de factura */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="bg-white border-gray-200 text-black max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl text-black flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-600" />
              DETALLE DE FACTURA
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 mt-4">
              {/* Info del cliente */}
              <div className="bg-gray-50 p-4 rounded-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-500 font-primary uppercase">Cliente</div>
                    <div className="font-secondary font-bold text-lg text-black">{selectedInvoice.client_name}</div>
                  </div>
                  <span className={`px-3 py-1 rounded-sm text-sm font-primary ${
                    selectedInvoice.status === 'pending' 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {selectedInvoice.status === 'pending' ? 'PENDIENTE DE FACTURAR' : 'FACTURADA'}
                  </span>
                </div>
                {selectedInvoice.invoiced_at && (
                  <div className="text-xs text-gray-500 font-primary mt-2">
                    Facturada el {new Date(selectedInvoice.invoiced_at).toLocaleDateString('es-CL')}
                  </div>
                )}
              </div>

              {/* Lista de items */}
              <div className="border border-gray-200 rounded-sm overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 font-secondary text-sm uppercase text-gray-600">
                  Productos ({selectedInvoice.items.length})
                </div>
                <div className="divide-y divide-gray-100">
                  {selectedInvoice.items.map((item, idx) => (
                    <div key={idx} className="px-4 py-3 bg-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-orange-500" />
                          <span className="font-primary text-black">{item.quantity}x {item.product_name}</span>
                          <span className="text-xs text-gray-400">[{item.category}]</span>
                        </div>
                        <span className="font-primary font-bold text-black">{formatCurrency(item.subtotal)}</span>
                      </div>
                      <div className="text-xs text-gray-500 font-primary mt-1 ml-6">
                        Venta #{item.sale_number} • {new Date(item.sale_date).toLocaleDateString('es-CL')}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-t border-gray-200">
                  <span className="font-secondary uppercase text-gray-600">Total</span>
                  <span className="font-secondary text-xl font-bold text-black">{formatCurrency(selectedInvoice.total_amount)}</span>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedInvoice(null)}
                  className="font-secondary uppercase"
                >
                  Cerrar
                </Button>
                {selectedInvoice.status === 'pending' && (
                  <Button
                    onClick={() => {
                      markInvoiceAsInvoiced(selectedInvoice.id);
                      setSelectedInvoice(null);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white font-secondary uppercase"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Marcar como Facturada
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
