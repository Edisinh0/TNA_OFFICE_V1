import { useState, useEffect } from 'react';
import apiClient from '../utils/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Bell, CheckCircle, XCircle, Eye, Edit2, Trash2, CalendarDays, Clock } from 'lucide-react';
import { toast } from 'sonner';

export const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    notes: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    details: {}
  });

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const response = await apiClient.get('/requests');
      setRequests(response.data);
    } catch (error) {
      toast.error('Error al cargar solicitudes');
    }
  };

  const handleUpdate = async () => {
    try {
      await apiClient.put(`/requests/${selectedRequest.id}`, {
        status: updateForm.status,
        notes: updateForm.notes,
        client_name: updateForm.client_name,
        client_email: updateForm.client_email,
        client_phone: updateForm.client_phone,
        details: updateForm.details
      });
      toast.success('Solicitud actualizada');
      setShowDetailModal(false);
      loadRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar solicitud');
    }
  };

  const handleDelete = async (requestId, status) => {
    if (status === 'confirmed') {
      toast.error('No se pueden eliminar solicitudes confirmadas. Cambie el estado primero.');
      return;
    }
    
    if (!window.confirm('¿Estás seguro de eliminar esta solicitud? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      await apiClient.delete(`/requests/${requestId}`);
      toast.success('Solicitud eliminada');
      setShowDetailModal(false);
      loadRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar solicitud');
    }
  };

  const openDetail = (request) => {
    setSelectedRequest(request);
    setUpdateForm({
      status: request.status,
      notes: request.notes || '',
      client_name: request.client_name || '',
      client_email: request.client_email || '',
      client_phone: request.client_phone || '',
      details: { ...(request.details || {}) }
    });
    setShowDetailModal(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      new: 'bg-[#FF8A00] text-white',
      confirmed: 'bg-blue-900 text-blue-300',
      completed: 'bg-green-900 text-green-300',
      rejected: 'bg-red-900 text-red-300'
    };
    return styles[status] || 'bg-zinc-800 text-gray-600';
  };

  const getStatusLabel = (status) => {
    const labels = {
      new: 'Nueva',
      confirmed: 'Confirmada',
      completed: 'Completada',
      rejected: 'Rechazada'
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type) => {
    const labels = {
      booking: 'Reserva',
      product: 'Producto',
      service: 'Servicio'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6" data-testid="requests-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-secondary text-4xl md:text-5xl font-black uppercase text-black tracking-tight">
            SOLICITUDES
          </h1>
          <div className="h-1 w-32 tna-gradient mt-4"></div>
        </div>
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-[#00E5FF]" strokeWidth={1.5} />
          <span className="text-black font-bold font-primary text-2xl">
            {requests.filter(r => r.status === 'new').length}
          </span>
          <span className="text-gray-500 font-primary text-sm">nuevas</span>
        </div>
      </div>

      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id} className="bg-white border-gray-200 rounded-sm hover:border-[#FF8A00] transition-all duration-300 hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-xs px-3 py-1 rounded-sm font-secondary uppercase font-bold ${getStatusBadge(request.status)}`}>
                      {getStatusLabel(request.status)}
                    </span>
                    <span className="text-xs px-3 py-1 rounded-sm bg-blue-100 text-blue-900 font-secondary uppercase font-bold">
                      {getTypeLabel(request.request_type)}
                    </span>
                    <span className="text-gray-600 text-xs font-primary">
                      {new Date(request.created_at).toLocaleDateString('es-CL')} - {new Date(request.created_at).toLocaleTimeString('es-CL')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <div className="text-gray-500 text-xs font-primary font-semibold mb-1 uppercase">Cliente</div>
                      <div className="text-black font-primary font-bold">{request.client_name}</div>
                      <div className="text-gray-600 text-sm font-primary">{request.client_email}</div>
                      {request.client_phone && (
                        <div className="text-gray-600 text-sm font-primary">{request.client_phone}</div>
                      )}
                    </div>
                    
                    <div className="col-span-2">
                      <div className="text-gray-500 text-xs font-primary font-semibold mb-1 uppercase">Detalles</div>
                      <div className="text-black font-primary text-sm space-y-2">
                        {request.details?.resource_name && (
                          <div><span className="font-semibold">Recurso:</span> <span className="text-blue-600 font-bold">{request.details.resource_name}</span></div>
                        )}
                        {request.details?.product_name && (
                          <div><span className="font-semibold">Producto:</span> <span className="text-orange-600 font-bold">{request.details.product_name}</span></div>
                        )}
                        {/* Fecha y hora destacada para reservas */}
                        {request.details?.start_time && (
                          <div className="mt-2 p-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg">
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="flex items-center gap-2">
                                <CalendarDays className="w-5 h-5 text-orange-600" />
                                <span className="text-orange-900 font-bold text-base">
                                  {new Date(request.details.start_time).toLocaleDateString('es-CL', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-orange-600" />
                                <span className="text-orange-900 font-bold text-base">
                                  {new Date(request.details.start_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                  {request.details?.end_time && (
                                    <span> - {new Date(request.details.end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        {request.details?.notes && (
                          <div className="text-gray-700 text-sm italic mt-2 p-2 bg-gray-50 rounded border-l-2 border-[#FF8A00]">"{request.details.notes}"</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {request.status !== 'confirmed' && (
                    <Button
                      data-testid={`delete-request-${request.id}`}
                      onClick={() => handleDelete(request.id, request.status)}
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-sm font-secondary uppercase transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    data-testid={`view-request-${request.id}`}
                    onClick={() => openDetail(request)}
                    size="sm"
                    className="bg-black text-white hover:bg-[#FF8A00] hover:text-white border-0 rounded-sm font-secondary uppercase transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    VER
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {requests.length === 0 && (
        <Card className="bg-white border-gray-200 rounded-sm">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 font-primary">No hay solicitudes</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="bg-white border-gray-200 text-black max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl text-black flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF8A00] rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              DETALLE DE SOLICITUD
            </DialogTitle>
            <div className="text-sm text-gray-600 font-primary mt-2">
              Revisa y actualiza el estado de la solicitud
            </div>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6 mt-4">
              {/* Información del cliente - Editable */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-secondary uppercase text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <Edit2 className="w-4 h-4" />
                  Información del Cliente
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600 text-xs font-primary font-semibold uppercase">Nombre</Label>
                    <Input
                      value={updateForm.client_name}
                      onChange={(e) => setUpdateForm({ ...updateForm, client_name: e.target.value })}
                      className="mt-1 bg-white border-gray-300 text-black font-primary"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-600 text-xs font-primary font-semibold uppercase">Email</Label>
                    <Input
                      type="email"
                      value={updateForm.client_email}
                      onChange={(e) => setUpdateForm({ ...updateForm, client_email: e.target.value })}
                      className="mt-1 bg-white border-gray-300 text-black font-primary"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-600 text-xs font-primary font-semibold uppercase">Teléfono</Label>
                    <Input
                      value={updateForm.client_phone}
                      onChange={(e) => setUpdateForm({ ...updateForm, client_phone: e.target.value })}
                      className="mt-1 bg-white border-gray-300 text-black font-primary"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-600 text-xs font-primary font-semibold uppercase">Tipo de Solicitud</Label>
                    <div className="text-black font-primary font-bold mt-2 px-3 py-2 bg-white rounded border border-gray-200">
                      {getTypeLabel(selectedRequest.request_type)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fecha y Hora Destacada - Solo para reservas */}
              {selectedRequest.request_type === 'booking' && updateForm.details?.start_time && (
                <div className="bg-gradient-to-r from-orange-100 via-amber-100 to-yellow-100 p-5 rounded-xl border-2 border-orange-300 shadow-md">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarDays className="w-6 h-6 text-orange-600" />
                    <h3 className="font-secondary uppercase text-lg font-bold text-orange-900">
                      FECHA Y HORA DE LA RESERVA
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-orange-200 shadow-sm">
                      <Label className="text-orange-600 text-xs font-secondary uppercase font-bold mb-2 block">
                        📅 Fecha
                      </Label>
                      <div className="text-2xl font-bold text-gray-900 font-primary">
                        {new Date(updateForm.details.start_time).toLocaleDateString('es-CL', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-orange-200 shadow-sm">
                      <Label className="text-orange-600 text-xs font-secondary uppercase font-bold mb-2 block">
                        🕐 Horario
                      </Label>
                      <div className="text-2xl font-bold text-gray-900 font-primary">
                        {new Date(updateForm.details.start_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        {updateForm.details.end_time && (
                          <span className="text-orange-600"> → </span>
                        )}
                        {updateForm.details.end_time && new Date(updateForm.details.end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {updateForm.details.end_time && (
                        <div className="text-sm text-gray-500 mt-1 font-primary">
                          Duración: {Math.round((new Date(updateForm.details.end_time) - new Date(updateForm.details.start_time)) / (1000 * 60))} minutos
                        </div>
                      )}
                    </div>
                  </div>
                  {updateForm.details.resource_name && (
                    <div className="mt-3 flex items-center gap-2 text-orange-800 font-primary">
                      <span className="font-semibold">Recurso:</span>
                      <span className="bg-white px-3 py-1 rounded-full border border-orange-200 font-bold">
                        {updateForm.details.resource_name}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Detalles de la solicitud - Editable */}
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <Label className="text-gray-600 text-xs font-primary font-semibold mb-3 block uppercase flex items-center gap-2">
                  <Edit2 className="w-3 h-3" />
                  Detalles Editables
                </Label>
                <div className="space-y-3">
                  {Object.entries(updateForm.details).map(([key, value]) => (
                    <div key={key}>
                      <Label className="text-gray-700 text-xs font-primary font-semibold capitalize mb-1 block">
                        {key.replace(/_/g, ' ')}
                      </Label>
                      {key.includes('time') ? (
                        <Input
                          type="datetime-local"
                          value={value ? value.slice(0, 16) : ''}
                          onChange={(e) => setUpdateForm({
                            ...updateForm,
                            details: { ...updateForm.details, [key]: e.target.value }
                          })}
                          className="bg-white border-gray-300 text-black font-primary text-sm"
                        />
                      ) : key === 'notes' ? (
                        <Textarea
                          value={value || ''}
                          onChange={(e) => setUpdateForm({
                            ...updateForm,
                            details: { ...updateForm.details, [key]: e.target.value }
                          })}
                          className="bg-white border-gray-300 text-black font-primary text-sm"
                          rows={2}
                        />
                      ) : key.includes('id') || key.includes('type') ? (
                        <div className="px-3 py-2 bg-gray-100 rounded border border-gray-200 text-gray-600 font-primary text-sm">
                          {typeof value === 'object' ? JSON.stringify(value) : value}
                        </div>
                      ) : (
                        <Input
                          value={typeof value === 'object' ? JSON.stringify(value) : (value || '')}
                          onChange={(e) => setUpdateForm({
                            ...updateForm,
                            details: { ...updateForm.details, [key]: e.target.value }
                          })}
                          className="bg-white border-gray-300 text-black font-primary text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Separador */}
              <div className="border-t border-gray-200 my-4"></div>

              {/* Actualización de estado */}
              <div>
                <Label className="text-black font-primary font-semibold mb-2 block uppercase text-sm">Estado de la Solicitud</Label>
                <Select value={updateForm.status} onValueChange={(value) => setUpdateForm({ ...updateForm, status: value })}>
                  <SelectTrigger data-testid="request-status-select" className="bg-gray-50 border-gray-300 text-black font-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300">
                    <SelectItem value="new" className="text-black font-primary">Nueva</SelectItem>
                    <SelectItem value="confirmed" className="text-black font-primary">Confirmada</SelectItem>
                    <SelectItem value="completed" className="text-black font-primary">Completada</SelectItem>
                    <SelectItem value="rejected" className="text-black font-primary">Rechazada</SelectItem>
                  </SelectContent>
                </Select>
                {selectedRequest.request_type === 'booking' && updateForm.status === 'confirmed' && !selectedRequest.booking_id && (
                  <p className="text-sm text-blue-600 font-primary mt-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Al confirmar, se creará automáticamente la reserva en el calendario
                  </p>
                )}
                {selectedRequest.booking_id && updateForm.status === 'rejected' && (
                  <p className="text-sm text-red-600 font-primary mt-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Al rechazar, se liberarán las horas reservadas en el calendario
                  </p>
                )}
              </div>

              {/* Notas */}
              <div>
                <Label className="text-black font-primary font-semibold mb-2 block uppercase text-sm">Notas Internas</Label>
                <Textarea
                  data-testid="request-notes-input"
                  value={updateForm.notes}
                  onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                  className="bg-gray-50 border-gray-300 text-black font-primary placeholder:text-gray-500"
                  rows={4}
                  placeholder="Agregar notas internas sobre esta solicitud..."
                />
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 pt-4">
                <Button
                  data-testid="update-request-button"
                  onClick={handleUpdate}
                  className="flex-1 bg-gradient-to-r from-[#FF8A00] to-orange-600 text-white hover:from-orange-600 hover:to-[#FF8A00] rounded-sm font-bold uppercase tracking-wide font-secondary py-6 shadow-lg"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  ACTUALIZAR SOLICITUD
                </Button>
                {selectedRequest.status !== 'confirmed' && (
                  <Button
                    data-testid="delete-request-button"
                    onClick={() => handleDelete(selectedRequest.id, selectedRequest.status)}
                    variant="outline"
                    className="px-6 font-secondary uppercase border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    ELIMINAR
                  </Button>
                )}
                <Button
                  onClick={() => setShowDetailModal(false)}
                  variant="outline"
                  className="px-6 font-secondary uppercase border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  CANCELAR
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};