import { useState, useEffect, useMemo } from 'react';
import apiClient from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Plus, Edit, Trash2, Image as ImageIcon, Search, Tag, Eye, EyeOff, Package, ClipboardList, AlertTriangle, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showInventoryReportModal, setShowInventoryReportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProductForStock, setSelectedProductForStock] = useState(null);
  const [addStockQuantity, setAddStockQuantity] = useState(1);
  const [addStockNotes, setAddStockNotes] = useState('');
  const [inventoryData, setInventoryData] = useState([]);
  const [inventoryReport, setInventoryReport] = useState(null);
  const [savingInventory, setSavingInventory] = useState(false);
  
  const [productForm, setProductForm] = useState({
    name: '',
    category: '',
    min_order: 1,
    sale_price: 0,
    cost_price: 0,
    commission_percentage: 0,
    provider: '',
    description: '',
    image_url: '',
    featured: false,
    featured_text: '',
    stock_control_enabled: false,
    current_stock: 0,
    min_stock_alert: 5
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Categorías
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      setProducts(response.data);
    } catch (error) {
      toast.error('Error al cargar productos');
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const resetForm = () => {
    setProductForm({
      name: '',
      category: '',
      min_order: 1,
      sale_price: 0,
      cost_price: 0,
      commission_percentage: 0,
      provider: '',
      description: '',
      image_url: '',
      featured: false,
      featured_text: '',
      stock_control_enabled: false,
      current_stock: 0,
      min_stock_alert: 5
    });
    setEditingProduct(null);
  };

  // Auto-habilitar control de stock para categoría específica
  const handleCategoryChange = (categoryName) => {
    const shouldEnableStock = categoryName.toLowerCase() === 'líquidos y alimentos';
    setProductForm({ 
      ...productForm, 
      category: categoryName,
      stock_control_enabled: editingProduct ? productForm.stock_control_enabled : shouldEnableStock
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductForm({ ...productForm, image_url: reader.result });
        toast.success('Imagen cargada');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Error al cargar imagen');
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await apiClient.put(`/products/${editingProduct.id}`, productForm);
        toast.success('Producto actualizado');
      } else {
        await apiClient.post('/products', productForm);
        toast.success('Producto creado');
      }
      setShowProductModal(false);
      resetForm();
      loadProducts();
    } catch (error) {
      toast.error('Error al guardar producto');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      category: product.category,
      min_order: product.min_order,
      sale_price: product.sale_price,
      cost_price: product.cost_price,
      commission_percentage: product.commission_percentage,
      provider: product.provider,
      description: product.description,
      image_url: product.image_url || '',
      featured: product.featured || false,
      featured_text: product.featured_text || '',
      stock_control_enabled: product.stock_control_enabled || false,
      current_stock: product.current_stock || 0,
      min_stock_alert: product.min_stock_alert || 5
    });
    setShowProductModal(true);
  };

  const handleDelete = async (productId) => {
    if (window.confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        await apiClient.delete(`/products/${productId}`);
        toast.success('Producto eliminado');
        loadProducts();
      } catch (error) {
        toast.error('Error al eliminar producto');
      }
    }
  };

  const handleToggleStockControl = async (product) => {
    try {
      await apiClient.post(`/products/${product.id}/toggle-stock-control?enabled=${!product.stock_control_enabled}`);
      toast.success(product.stock_control_enabled ? 'Control de stock deshabilitado' : 'Control de stock habilitado');
      loadProducts();
    } catch (error) {
      toast.error('Error al cambiar control de stock');
    }
  };

  const handleOpenAddStock = (product) => {
    setSelectedProductForStock(product);
    setAddStockQuantity(1);
    setAddStockNotes('');
    setShowAddStockModal(true);
  };

  const handleAddStock = async () => {
    if (!selectedProductForStock) return;
    
    try {
      await apiClient.post(`/products/${selectedProductForStock.id}/add-stock?quantity=${addStockQuantity}&notes=${encodeURIComponent(addStockNotes)}`);
      toast.success(`Stock agregado: +${addStockQuantity} unidades`);
      setShowAddStockModal(false);
      loadProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al agregar stock');
    }
  };

  const handleOpenInventory = () => {
    const stockProducts = products.filter(p => p.stock_control_enabled);
    setInventoryData(stockProducts.map(p => ({
      product_id: p.id,
      product_name: p.name,
      category: p.category,
      system_stock: p.current_stock || 0,
      counted_stock: p.current_stock || 0
    })));
    setShowInventoryModal(true);
  };

  const handleInventoryChange = (productId, countedStock) => {
    setInventoryData(prev => prev.map(item => 
      item.product_id === productId 
        ? { ...item, counted_stock: parseInt(countedStock) || 0 }
        : item
    ));
  };

  const handleSaveInventory = async () => {
    setSavingInventory(true);
    try {
      const response = await apiClient.post('/inventory/save', inventoryData);
      setInventoryReport(response.data.report);
      setShowInventoryModal(false);
      setShowInventoryReportModal(true);
      loadProducts();
      toast.success('Inventario guardado exitosamente');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar inventario');
    } finally {
      setSavingInventory(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  // Obtener nombres de categorías para el select
  const categoryNames = useMemo(() => {
    return categories.map(cat => cat.name).sort();
  }, [categories]);

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Productos con control de stock
  const productsWithStockControl = useMemo(() => {
    return products.filter(p => p.stock_control_enabled);
  }, [products]);

  // Productos con stock bajo
  const lowStockProducts = useMemo(() => {
    return productsWithStockControl.filter(p => (p.current_stock || 0) <= (p.min_stock_alert || 5));
  }, [productsWithStockControl]);

  // Manejar categorías
  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast.error('Ingresa un nombre de categoría');
      return;
    }
    if (categoryNames.includes(newCategory.trim())) {
      toast.error('Esta categoría ya existe');
      return;
    }
    
    try {
      await apiClient.post('/categories', { name: newCategory.trim() });
      toast.success('Categoría creada exitosamente');
      setNewCategory('');
      await loadCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear categoría');
    }
  };

  const handleRenameCategory = async (categoryObj, newCategoryName) => {
    if (!newCategoryName.trim()) {
      toast.error('Ingresa un nuevo nombre');
      return;
    }
    
    try {
      await apiClient.put(`/categories/${categoryObj.id}`, { 
        name: newCategoryName.trim(),
        show_in_fanpage: categoryObj.show_in_fanpage ?? true
      });
      toast.success('Categoría renombrada y productos actualizados');
      setEditingCategory(null);
      await loadCategories();
      await loadProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al renombrar categoría');
    }
  };

  const handleToggleCategoryVisibility = async (categoryObj) => {
    try {
      const newVisibility = !(categoryObj.show_in_fanpage ?? true);
      await apiClient.put(`/categories/${categoryObj.id}`, { 
        name: categoryObj.name,
        show_in_fanpage: newVisibility
      });
      toast.success(newVisibility ? 'Categoría visible en FanPage' : 'Categoría oculta de FanPage');
      await loadCategories();
    } catch (error) {
      toast.error('Error al actualizar visibilidad');
    }
  };

  const handleDeleteCategory = async (categoryObj) => {
    const productsCount = products.filter(p => p.category === categoryObj.name).length;
    
    if (productsCount > 0) {
      toast.error(`No se puede eliminar. Hay ${productsCount} producto(s) usando esta categoría`);
      return;
    }
    
    if (!window.confirm(`¿Eliminar la categoría "${categoryObj.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/categories/${categoryObj.id}`);
      toast.success('Categoría eliminada');
      await loadCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar categoría');
    }
  };

  return (
    <div className="space-y-6" data-testid="products-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-secondary text-4xl md:text-5xl font-black uppercase text-black tracking-tight">
            PRODUCTOS Y SERVICIOS
          </h1>
          <div className="h-1 w-32 tna-gradient mt-4"></div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowCategoriesModal(true)}
            variant="outline"
            className="border-gray-300 text-black hover:bg-gray-50 rounded-sm font-bold uppercase tracking-wide font-secondary text-xs"
          >
            <Tag className="w-4 h-4 mr-1" />
            Categorías
          </Button>
          <Button
            onClick={handleOpenInventory}
            variant="outline"
            className="border-purple-300 text-purple-700 hover:bg-purple-50 rounded-sm font-bold uppercase tracking-wide font-secondary text-xs"
            disabled={productsWithStockControl.length === 0}
          >
            <ClipboardList className="w-4 h-4 mr-1" />
            Inventario
          </Button>
          <Button
            data-testid="add-product-button"
            onClick={() => {
              resetForm();
              setShowProductModal(true);
            }}
            className="bg-black text-white hover:bg-gray-800 rounded-sm font-bold uppercase tracking-wide font-secondary text-xs"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nuevo
          </Button>
        </div>
      </div>

      {/* Alerta de Stock Bajo */}
      {lowStockProducts.length > 0 && (
        <Card className="bg-amber-50 border-amber-300 rounded-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-bold text-amber-800 font-secondary">Stock Bajo</p>
                <p className="text-sm text-amber-700">
                  {lowStockProducts.length} producto(s) con stock bajo o agotado: {' '}
                  <span className="font-medium">
                    {lowStockProducts.map(p => `${p.name} (${p.current_stock || 0})`).join(', ')}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card className="bg-white border-gray-200 rounded-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-sm"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[200px] rounded-sm">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categoryNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Productos */}
      <Card className="bg-white border-gray-200 rounded-sm">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="font-secondary uppercase text-black flex items-center justify-between">
            <span>Productos ({filteredProducts.length})</span>
            <span className="text-xs font-normal text-gray-500">
              {productsWithStockControl.length} con control de stock
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Categoría</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-600">Precio</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-600">Costo</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase text-gray-600">Stock</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase text-gray-600">Control Stock</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-black">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.provider}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm px-2 py-1 bg-gray-100 rounded">{product.category}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(product.sale_price)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(product.cost_price)}</td>
                    <td className="px-4 py-3 text-center">
                      {product.stock_control_enabled ? (
                        <div className="flex items-center justify-center gap-2">
                          <span className={`font-bold ${
                            (product.current_stock || 0) <= (product.min_stock_alert || 5)
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}>
                            {product.current_stock || 0}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenAddStock(product)}
                            className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Agregar stock"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={product.stock_control_enabled || false}
                        onCheckedChange={() => handleToggleStockControl(product)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(product)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(product.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Agregar/Editar Producto */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-black">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nombre *</Label>
                <Input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  required
                  className="rounded-sm"
                />
              </div>
              
              <div>
                <Label>Categoría *</Label>
                <Select 
                  value={productForm.category} 
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="rounded-sm">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryNames.map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Proveedor</Label>
                <Input
                  value={productForm.provider}
                  onChange={(e) => setProductForm({ ...productForm, provider: e.target.value })}
                  className="rounded-sm"
                />
              </div>
              
              <div>
                <Label>Precio Venta *</Label>
                <Input
                  type="number"
                  value={productForm.sale_price}
                  onChange={(e) => setProductForm({ ...productForm, sale_price: parseFloat(e.target.value) || 0 })}
                  required
                  className="rounded-sm"
                />
              </div>
              
              <div>
                <Label>Costo *</Label>
                <Input
                  type="number"
                  value={productForm.cost_price}
                  onChange={(e) => setProductForm({ ...productForm, cost_price: parseFloat(e.target.value) || 0 })}
                  required
                  className="rounded-sm"
                />
              </div>
              
              <div>
                <Label>Comisión %</Label>
                <Input
                  type="number"
                  value={productForm.commission_percentage}
                  onChange={(e) => setProductForm({ ...productForm, commission_percentage: parseFloat(e.target.value) || 0 })}
                  className="rounded-sm"
                />
              </div>
              
              <div>
                <Label>Pedido Mínimo</Label>
                <Input
                  type="number"
                  value={productForm.min_order}
                  onChange={(e) => setProductForm({ ...productForm, min_order: parseInt(e.target.value) || 1 })}
                  className="rounded-sm"
                />
              </div>
              
              <div className="col-span-2">
                <Label>Descripción</Label>
                <Textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows={2}
                  className="rounded-sm"
                />
              </div>
              
              {/* Control de Stock */}
              <div className="col-span-2 border-t pt-4 mt-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Label className="text-base font-bold">Control de Stock</Label>
                    <p className="text-xs text-gray-500">Habilitar seguimiento de inventario</p>
                  </div>
                  <Switch
                    checked={productForm.stock_control_enabled}
                    onCheckedChange={(checked) => setProductForm({ ...productForm, stock_control_enabled: checked })}
                  />
                </div>
                
                {productForm.stock_control_enabled && (
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded">
                    <div>
                      <Label>Stock Actual</Label>
                      <Input
                        type="number"
                        value={productForm.current_stock}
                        onChange={(e) => setProductForm({ ...productForm, current_stock: parseInt(e.target.value) || 0 })}
                        className="rounded-sm"
                      />
                    </div>
                    <div>
                      <Label>Alerta Stock Mínimo</Label>
                      <Input
                        type="number"
                        value={productForm.min_stock_alert}
                        onChange={(e) => setProductForm({ ...productForm, min_stock_alert: parseInt(e.target.value) || 5 })}
                        className="rounded-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Imagen */}
              <div className="col-span-2">
                <Label>Imagen del Producto</Label>
                <div className="flex items-center gap-4 mt-2">
                  {productForm.image_url ? (
                    <img 
                      src={productForm.image_url} 
                      alt="Preview"
                      className="w-20 h-20 object-cover rounded border"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded border flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="product-image"
                    />
                    <label
                      htmlFor="product-image"
                      className="cursor-pointer inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                    >
                      {uploadingImage ? 'Cargando...' : 'Subir imagen'}
                    </label>
                    <Input
                      placeholder="O pega URL de imagen"
                      value={productForm.image_url?.startsWith('data:') ? '' : productForm.image_url}
                      onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                      className="mt-2 rounded-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowProductModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-black text-white hover:bg-gray-800">
                {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Agregar Stock */}
      <Dialog open={showAddStockModal} onOpenChange={setShowAddStockModal}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-black flex items-center gap-2">
              <Package className="w-5 h-5 text-green-600" />
              Agregar Stock
            </DialogTitle>
          </DialogHeader>
          
          {selectedProductForStock && (
            <div className="space-y-4 mt-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-bold">{selectedProductForStock.name}</p>
                <p className="text-sm text-gray-500">Stock actual: {selectedProductForStock.current_stock || 0} unidades</p>
              </div>
              
              <div>
                <Label>Cantidad a agregar</Label>
                <Input
                  type="number"
                  min="1"
                  value={addStockQuantity}
                  onChange={(e) => setAddStockQuantity(parseInt(e.target.value) || 1)}
                  className="rounded-sm"
                />
              </div>
              
              <div>
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={addStockNotes}
                  onChange={(e) => setAddStockNotes(e.target.value)}
                  placeholder="Ej: Compra a proveedor X"
                  rows={2}
                  className="rounded-sm"
                />
              </div>
              
              <div className="bg-green-50 p-3 rounded">
                <p className="text-sm text-green-700">
                  Nuevo stock: <span className="font-bold">{(selectedProductForStock.current_stock || 0) + addStockQuantity}</span> unidades
                </p>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowAddStockModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddStock} className="bg-green-600 text-white hover:bg-green-700">
                  Agregar Stock
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Inventario */}
      <Dialog open={showInventoryModal} onOpenChange={setShowInventoryModal}>
        <DialogContent className="max-w-3xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-black flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-purple-600" />
              Realizar Inventario
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <p className="text-sm text-gray-600">
              Ingresa la cantidad real contada para cada producto. Al guardar se ajustará el stock y se generará un informe con las diferencias.
            </p>
            
            <div className="border rounded overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold uppercase text-gray-600">Producto</th>
                    <th className="px-4 py-2 text-center text-xs font-bold uppercase text-gray-600">Stock Sistema</th>
                    <th className="px-4 py-2 text-center text-xs font-bold uppercase text-gray-600">Stock Contado</th>
                    <th className="px-4 py-2 text-center text-xs font-bold uppercase text-gray-600">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {inventoryData.map(item => {
                    const diff = item.counted_stock - item.system_stock;
                    return (
                      <tr key={item.product_id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-xs text-gray-500">{item.category}</p>
                        </td>
                        <td className="px-4 py-2 text-center font-medium">{item.system_stock}</td>
                        <td className="px-4 py-2 text-center">
                          <Input
                            type="number"
                            min="0"
                            value={item.counted_stock}
                            onChange={(e) => handleInventoryChange(item.product_id, e.target.value)}
                            className="w-20 mx-auto text-center rounded-sm"
                          />
                        </td>
                        <td className={`px-4 py-2 text-center font-bold ${
                          diff === 0 ? 'text-gray-400' : diff > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {diff > 0 ? `+${diff}` : diff}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {inventoryData.length === 0 && (
              <p className="text-center text-gray-500 py-8">No hay productos con control de stock habilitado</p>
            )}
            
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowInventoryModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveInventory} 
                disabled={savingInventory || inventoryData.length === 0}
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                {savingInventory ? 'Guardando...' : 'Guardar Inventario'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Reporte de Inventario */}
      <Dialog open={showInventoryReportModal} onOpenChange={setShowInventoryReportModal}>
        <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-black flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Informe de Inventario
            </DialogTitle>
          </DialogHeader>
          
          {inventoryReport && (
            <div className="space-y-4 mt-4">
              {/* Resumen */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-100 p-3 rounded text-center">
                  <p className="text-2xl font-bold">{inventoryReport.total_products}</p>
                  <p className="text-xs text-gray-600">Productos</p>
                </div>
                <div className="bg-amber-100 p-3 rounded text-center">
                  <p className="text-2xl font-bold text-amber-700">{inventoryReport.products_with_difference}</p>
                  <p className="text-xs text-amber-700">Con Diferencia</p>
                </div>
                <div className="bg-green-100 p-3 rounded text-center">
                  <p className="text-2xl font-bold text-green-700">+{inventoryReport.total_positive_diff}</p>
                  <p className="text-xs text-green-700">Sobrantes</p>
                </div>
                <div className="bg-red-100 p-3 rounded text-center">
                  <p className="text-2xl font-bold text-red-700">-{inventoryReport.total_negative_diff}</p>
                  <p className="text-xs text-red-700">Faltantes</p>
                </div>
              </div>
              
              {/* Detalle de diferencias */}
              {inventoryReport.products_with_difference > 0 && (
                <div className="border rounded overflow-hidden">
                  <div className="bg-amber-50 px-4 py-2 font-bold text-sm">
                    Productos con Diferencias
                  </div>
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold uppercase">Producto</th>
                        <th className="px-4 py-2 text-center text-xs font-bold uppercase">Sistema</th>
                        <th className="px-4 py-2 text-center text-xs font-bold uppercase">Contado</th>
                        <th className="px-4 py-2 text-center text-xs font-bold uppercase">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {inventoryReport.items.filter(i => i.difference !== 0).map(item => (
                        <tr key={item.product_id}>
                          <td className="px-4 py-2 font-medium">{item.product_name}</td>
                          <td className="px-4 py-2 text-center">{item.system_stock}</td>
                          <td className="px-4 py-2 text-center">{item.counted_stock}</td>
                          <td className={`px-4 py-2 text-center font-bold ${
                            item.difference > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {item.difference > 0 ? `+${item.difference}` : item.difference}
                            <span className="text-xs font-normal ml-1">
                              ({item.difference > 0 ? 'sobrante' : 'faltante'})
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="text-xs text-gray-500">
                Inventario realizado el {new Date(inventoryReport.created_at).toLocaleString('es-CL')} por {inventoryReport.created_by}
              </div>
              
              <div className="flex justify-end">
                <Button onClick={() => setShowInventoryReportModal(false)} className="bg-black text-white hover:bg-gray-800">
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Categorías */}
      <Dialog open={showCategoriesModal} onOpenChange={setShowCategoriesModal}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-black">
              Gestionar Categorías
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Nueva categoría */}
            <div className="flex gap-2">
              <Input
                placeholder="Nueva categoría..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="rounded-sm flex-1"
              />
              <Button onClick={handleAddCategory} className="bg-black text-white hover:bg-gray-800 rounded-sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Lista de categorías */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  {editingCategory?.id === cat.id ? (
                    <div className="flex gap-2 flex-1">
                      <Input
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        className="flex-1 h-8"
                      />
                      <Button size="sm" onClick={() => handleRenameCategory(cat, editingCategory.name)} className="bg-green-600 text-white h-8">
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)} className="h-8">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium">{cat.name}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleCategoryVisibility(cat)}
                          className={`h-8 w-8 p-0 ${cat.show_in_fanpage !== false ? 'text-green-600' : 'text-gray-400'}`}
                          title={cat.show_in_fanpage !== false ? 'Visible en FanPage' : 'Oculta de FanPage'}
                        >
                          {cat.show_in_fanpage !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingCategory({ id: cat.id, name: cat.name })}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCategory(cat)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
