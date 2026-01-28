import { useState, useEffect, useRef } from 'react';
import apiClient from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, CheckCircle, DollarSign, Search, X, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { getUser } from '../utils/auth';

export const Sales = () => {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [comisionistas, setComisionistas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Estados para autocompletado de producto
  const [productSearch, setProductSearch] = useState('');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const productInputRef = useRef(null);
  
  // Estados para búsqueda de cliente
  const [clientSearch, setClientSearch] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const clientInputRef = useRef(null);
  
  const [form, setForm] = useState({
    product_id: '',
    quantity: 1,
    comisionista_id: '',
    client_name: '',
    client_email: '',
    notes: ''
  });
  const user = getUser();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [salesRes, productsRes, comisionistasRes, clientsRes] = await Promise.all([
        apiClient.get('/sales'),
        apiClient.get('/products'),
        apiClient.get('/comisionistas'),
        apiClient.get('/clients')
      ]);
      setSales(salesRes.data);
      setProducts(productsRes.data);
      setComisionistas(comisionistasRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    }
  };

  // Filtrar productos según búsqueda
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                         p.category.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCategory = !selectedCategory || selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filtrar clientes según búsqueda
  const filteredClients = clients.filter(c => 
    c.company_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.rut && c.rut.toLowerCase().includes(clientSearch.toLowerCase()))
  );

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setProductSearch(product.name);
    setForm({ ...form, product_id: product.id });
    setShowProductSuggestions(false);
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setClientSearch(client.company_name);
    setForm({ ...form, client_name: client.company_name, client_email: client.contacts?.[0]?.email || '' });
    setShowClientSuggestions(false);
  };

  const clearProduct = () => {
    setSelectedProduct(null);
    setProductSearch('');
    setForm({ ...form, product_id: '' });
  };

  const clearClient = () => {
    setSelectedClient(null);
    setClientSearch('');
    setForm({ ...form, client_name: '', client_email: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_id) {
      toast.error('Selecciona un producto');
      return;
    }
    try {
      await apiClient.post('/sales', form);
      toast.success('Venta registrada');
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Error al registrar venta');
    }
  };

  const resetForm = () => {
    setForm({
      product_id: '',
      quantity: 1,
      comisionista_id: '',
      client_name: '',
      client_email: '',
      notes: ''
    });
    setSelectedProduct(null);
    setProductSearch('');
    setSelectedClient(null);
    setClientSearch('');
    setSelectedCategory('');
  };

  const updatePaymentStatus = async (saleId, status) => {
    try {
      await apiClient.put(`/sales/${saleId}/payment?payment_status=${status}`);
      toast.success('Estado de pago actualizado');
      loadData();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const updateCommissionStatus = async (saleId, status) => {
    try {
      await apiClient.put(`/sales/${saleId}/commission?commission_status=${status}`);
      toast.success('Estado de comisión actualizado');
      loadData();
    } catch (error) {
      toast.error('Error al actualizar comisión');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  return (
    <div className="space-y-6" data-testid="sales-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-secondary text-4xl md:text-5xl font-black uppercase text-black tracking-tight">
            VENTAS
          </h1>
          <div className="h-1 w-32 tna-gradient mt-4"></div>
        </div>
        {user?.role !== 'comisionista' && (
          <Button
            data-testid="add-sale-button"
            onClick={() => setShowModal(true)}
            className="bg-white text-black hover:bg-zinc-200 rounded-sm font-bold uppercase tracking-wide font-secondary"
          >
            <Plus className="w-4 h-4 mr-2" />
            NUEVA VENTA
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {sales.map((sale) => (
          <Card key={sale.id} className="bg-white border-gray-200 rounded-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-[#FF8A00] font-secondary uppercase mb-1">{sale.category}</div>
                  <div className="text-black font-bold font-primary">{sale.product_name}</div>
                  <div className="text-gray-500 text-xs font-primary mt-1">
                    {new Date(sale.sale_date).toLocaleDateString('es-CL')}
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-500 text-xs font-primary mb-1">Cliente</div>
                  <div className="text-black font-primary text-sm">{sale.client_name}</div>
                  <div className="text-gray-500 text-xs font-primary">{sale.client_email}</div>
                </div>
                
                <div>
                  <div className="text-gray-500 text-xs font-primary mb-1">Comisionista</div>
                  <div className="text-black font-primary text-sm">{sale.comisionista_name || 'N/A'}</div>
                  <div className="text-[#00E5FF] font-bold text-sm">{formatCurrency(sale.commission_amount)}</div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="text-gray-500 text-xs font-primary">Total: <span className="text-black font-bold">{formatCurrency(sale.total_amount)}</span></div>
                  
                  {user?.role === 'admin' && (
                    <div className="flex gap-2">
                      {sale.payment_status === 'pending' && (
                        <Button
                          data-testid={`mark-paid-${sale.id}`}
                          size="sm"
                          onClick={() => updatePaymentStatus(sale.id, 'paid')}
                          className="bg-green-900 hover:bg-green-800 text-white rounded-sm text-xs font-secondary"
                        >
                          <DollarSign className="w-3 h-3 mr-1" />
                          PAGAR
                        </Button>
                      )}
                      {sale.payment_status === 'paid' && sale.commission_status === 'pending' && (
                        <Button
                          data-testid={`pay-commission-${sale.id}`}
                          size="sm"
                          onClick={() => updateCommissionStatus(sale.id, 'paid')}
                          className="bg-blue-900 hover:bg-blue-800 text-white rounded-sm text-xs font-secondary"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          COMISIÓN
                        </Button>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded-sm font-primary ${
                      sale.payment_status === 'paid' ? 'bg-green-900 text-green-300' : 'bg-zinc-800 text-gray-600'
                    }`}>
                      Pago: {sale.payment_status}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-sm font-primary ${
                      sale.commission_status === 'paid' ? 'bg-blue-900 text-blue-300' : 'bg-zinc-800 text-gray-600'
                    }`}>
                      Com.: {sale.commission_status}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sales.length === 0 && (
        <Card className="bg-white border-gray-200 rounded-sm">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 font-primary">No hay ventas registradas</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showModal} onOpenChange={(open) => {
        setShowModal(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="bg-white border-gray-200 text-black max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl text-black">NUEVA VENTA</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Categoría */}
            <div>
              <Label className="text-black font-primary font-medium">Categoría (filtro opcional)</Label>
              <Select value={selectedCategory} onValueChange={(value) => {
                setSelectedCategory(value);
                clearProduct();
              }}>
                <SelectTrigger data-testid="sale-category-select" className="bg-white border-gray-300 text-black">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300 text-black max-h-60">
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {[...new Set(products.map(p => p.category))].sort().map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Producto con autocompletado */}
            <div className="relative">
              <Label className="text-black font-primary font-medium">Producto/Servicio *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  ref={productInputRef}
                  data-testid="sale-product-search"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowProductSuggestions(true);
                    if (!e.target.value) clearProduct();
                  }}
                  onFocus={() => setShowProductSuggestions(true)}
                  className="bg-white border-gray-300 text-black pl-10 pr-10"
                  placeholder="Escribe para buscar producto..."
                  required={!selectedProduct}
                />
                {selectedProduct && (
                  <button
                    type="button"
                    onClick={clearProduct}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Lista de sugerencias de productos */}
              {showProductSuggestions && productSearch && !selectedProduct && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-sm shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.slice(0, 10).map(product => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleSelectProduct(product)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-xs text-orange-600 font-primary">[{product.category}]</span>
                            <span className="ml-2 font-primary text-black">{product.name}</span>
                          </div>
                          <span className="text-green-600 font-bold font-primary">${product.sale_price.toLocaleString()}</span>
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
              
              {selectedProduct && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-sm">
                  <p className="text-sm font-primary">
                    <span className="text-orange-600">[{selectedProduct.category}]</span>
                    <span className="font-bold text-black ml-2">{selectedProduct.name}</span>
                    <span className="text-green-600 ml-2">${selectedProduct.sale_price.toLocaleString()}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Cantidad */}
            <div>
              <Label className="text-black font-primary font-medium">Cantidad</Label>
              <Input
                data-testid="sale-quantity-input"
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                className="bg-white border-gray-300 text-black"
                required
              />
            </div>

            {/* Comisionista */}
            <div>
              <Label className="text-black font-primary font-medium">Comisionista (opcional)</Label>
              <Select value={form.comisionista_id} onValueChange={(value) => setForm({ ...form, comisionista_id: value })}>
                <SelectTrigger className="bg-white border-gray-300 text-black">
                  <SelectValue placeholder="Sin comisionista" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300 text-black">
                  {comisionistas.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cliente con búsqueda */}
            <div className="relative">
              <Label className="text-black font-primary font-medium">Cliente *</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  ref={clientInputRef}
                  data-testid="sale-client-search"
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
              
              {/* Lista de sugerencias de clientes */}
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
                        <div>
                          <span className="font-primary text-black font-medium">{client.company_name}</span>
                          {client.rut && <span className="text-xs text-gray-500 ml-2">{client.rut}</span>}
                        </div>
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
              
              <p className="text-xs text-gray-500 mt-1 font-primary">
                Busca un cliente existente o escribe el nombre directamente
              </p>
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

            <Button
              data-testid="submit-sale-button"
              type="submit"
              className="w-full bg-black text-white hover:bg-gray-800 rounded-sm font-bold uppercase tracking-wide font-secondary"
            >
              REGISTRAR VENTA
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};